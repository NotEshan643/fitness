"""Spotify control via spotipy — full playback surface (Phase 6).

A single authenticated controller is cached per process (single user). Without
credentials or an active device, every method degrades gracefully (logs +
returns False / a clear message) so music never crashes the assistant.

Voice-friendly: "Jarvis, play my workout playlist", "Jarvis, pause music".
Requires a Spotify Premium account and OAuth credentials in .env; the first
call opens a browser to authorize and the token is cached locally.
"""

from __future__ import annotations

from typing import Any

from ..core.config import Settings
from ..core.logging import get_logger
from ..core.paths import paths
from ..security.permissions import RiskLevel
from .base import Tool, ToolContext, ToolResult

log = get_logger("tools.spotify")

_SCOPE = (
    "user-read-playback-state user-modify-playback-state "
    "user-read-currently-playing playlist-read-private"
)
_controller: "SpotifyController | None" = None


class SpotifyController:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._sp = None

    @property
    def configured(self) -> bool:
        s = self.settings.secrets
        return bool(s.spotify_client_id and s.spotify_client_secret)

    @property
    def sp(self):
        if self._sp is None:
            import spotipy
            from spotipy.oauth2 import SpotifyOAuth

            s = self.settings.secrets
            self._sp = spotipy.Spotify(
                auth_manager=SpotifyOAuth(
                    client_id=s.spotify_client_id,
                    client_secret=s.spotify_client_secret,
                    redirect_uri=s.spotify_redirect_uri,
                    scope=_SCOPE,
                    cache_path=str(paths.data_dir / ".spotify_token"),
                    open_browser=True,
                )
            )
        return self._sp

    # ── playback ───────────────────────────────────────────────────────
    def play_query(self, query: str) -> bool:
        if not self.configured:
            log.info("Spotify not configured; skipping play(%r)", query)
            return False
        try:
            res = self.sp.search(q=query, type="track", limit=1)
            items = res.get("tracks", {}).get("items", [])
            if not items:
                return False
            self.sp.start_playback(uris=[items[0]["uri"]])
            return True
        except Exception as exc:
            log.warning("Spotify play failed: %s", exc)
            return False

    def play_playlist(self, name: str) -> str | None:
        """Find a playlist by (partial) name and play it. Returns its name."""
        if not self.configured:
            return None
        try:
            playlists = self.sp.current_user_playlists(limit=50).get("items", [])
            match = next(
                (p for p in playlists if name.lower() in p["name"].lower()), None
            )
            if not match:
                return None
            self.sp.start_playback(context_uri=match["uri"])
            return match["name"]
        except Exception as exc:
            log.warning("Spotify playlist failed: %s", exc)
            return None

    def now_playing(self) -> str | None:
        if not self.configured:
            return None
        try:
            cur = self.sp.current_playback()
            if not cur or not cur.get("item"):
                return None
            item = cur["item"]
            artists = ", ".join(a["name"] for a in item.get("artists", []))
            return f"{item['name']} by {artists}"
        except Exception:
            return None

    def pause(self) -> bool:
        return self._safe(lambda: self.sp.pause_playback())

    def resume(self) -> bool:
        return self._safe(lambda: self.sp.start_playback())

    def next_track(self) -> bool:
        return self._safe(lambda: self.sp.next_track())

    def previous_track(self) -> bool:
        return self._safe(lambda: self.sp.previous_track())

    def set_volume(self, percent: int) -> bool:
        percent = max(0, min(100, percent))
        return self._safe(lambda: self.sp.volume(percent))

    def _safe(self, fn) -> bool:
        if not self.configured:
            return False
        try:
            fn()
            return True
        except Exception as exc:
            log.warning("Spotify control failed: %s", exc)
            return False


def get_controller(settings: Settings) -> SpotifyController:
    global _controller
    if _controller is None:
        _controller = SpotifyController(settings)
    return _controller


# ── tool handlers ──────────────────────────────────────────────────────
def _unconfigured() -> ToolResult:
    return ToolResult(
        text="Spotify isn't set up, Sir. Add SPOTIFY_CLIENT_ID/SECRET to .env.",
        ok=False,
    )


def _play(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    c = get_controller(ctx.settings)
    if not c.configured:
        return _unconfigured()
    q = args["query"]
    if args.get("playlist"):
        name = c.play_playlist(q)
        return ToolResult(text=f"Playing playlist {name}." if name else f"No playlist matching '{q}'.",
                          ok=bool(name))
    ok = c.play_query(q)
    return ToolResult(text=f"Playing {q}." if ok else f"Couldn't play '{q}'.", ok=ok)


def _simple(method: str, ok_msg: str):
    def handler(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
        c = get_controller(ctx.settings)
        if not c.configured:
            return _unconfigured()
        ok = getattr(c, method)()
        return ToolResult(text=ok_msg if ok else "No active Spotify device.", ok=ok)

    return handler


def _volume(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    c = get_controller(ctx.settings)
    if not c.configured:
        return _unconfigured()
    level = int(args["level"])
    ok = c.set_volume(level)
    return ToolResult(text=f"Spotify volume {level}%." if ok else "No active device.", ok=ok)


def _now(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    c = get_controller(ctx.settings)
    if not c.configured:
        return _unconfigured()
    track = c.now_playing()
    return ToolResult(text=f"Now playing: {track}." if track else "Nothing is playing.")


def register(reg) -> None:
    reg.add(Tool(
        name="spotify_play",
        description="Play a track, or a playlist by name on Spotify. Set playlist=true for playlists.",
        parameters={"type": "object", "properties": {
            "query": {"type": "string", "description": "Track or playlist name."},
            "playlist": {"type": "boolean", "description": "True to play a named playlist."}},
            "required": ["query"]},
        handler=_play, risk=RiskLevel.SAFE,
    ))
    reg.add(Tool(name="spotify_pause", description="Pause Spotify playback.",
                 parameters={"type": "object", "properties": {}},
                 handler=_simple("pause", "Paused."), risk=RiskLevel.SAFE))
    reg.add(Tool(name="spotify_resume", description="Resume Spotify playback.",
                 parameters={"type": "object", "properties": {}},
                 handler=_simple("resume", "Resumed."), risk=RiskLevel.SAFE))
    reg.add(Tool(name="spotify_next", description="Skip to the next track.",
                 parameters={"type": "object", "properties": {}},
                 handler=_simple("next_track", "Skipped."), risk=RiskLevel.SAFE))
    reg.add(Tool(name="spotify_previous", description="Go to the previous track.",
                 parameters={"type": "object", "properties": {}},
                 handler=_simple("previous_track", "Previous track."), risk=RiskLevel.SAFE))
    reg.add(Tool(
        name="spotify_volume", description="Set Spotify volume (0-100).",
        parameters={"type": "object", "properties": {
            "level": {"type": "integer", "minimum": 0, "maximum": 100}},
            "required": ["level"]},
        handler=_volume, risk=RiskLevel.SAFE,
    ))
    reg.add(Tool(name="spotify_now_playing", description="Report the current Spotify track.",
                 parameters={"type": "object", "properties": {}},
                 handler=_now, risk=RiskLevel.SAFE))
