"""Spotify control via spotipy.

Introduced in Phase 2 for the startup ritual ("Highway to Hell"); the full tool
surface (search/playlists/voice control) lands in Phase 6. The controller
degrades gracefully: without credentials or an active device it logs and
no-ops rather than raising, so the wake ritual never fails because of music.

Requires a Spotify Premium account and the OAuth credentials in .env. The first
call opens a browser to authorize; the token is cached locally by spotipy.
"""

from __future__ import annotations

from ..core.config import Settings
from ..core.logging import get_logger
from ..core.paths import paths

log = get_logger("tools.spotify")

_SCOPE = "user-read-playback-state user-modify-playback-state user-read-currently-playing"


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
        """Search for a track and start playing it. Returns success."""
        if not self.configured:
            log.info("Spotify not configured; skipping play(%r)", query)
            return False
        try:
            results = self.sp.search(q=query, type="track", limit=1)
            items = results.get("tracks", {}).get("items", [])
            if not items:
                return False
            self.sp.start_playback(uris=[items[0]["uri"]])
            return True
        except Exception as exc:
            log.warning("Spotify play failed: %s", exc)
            return False

    def pause(self) -> bool:
        return self._safe(lambda: self.sp.pause_playback())

    def resume(self) -> bool:
        return self._safe(lambda: self.sp.start_playback())

    def next_track(self) -> bool:
        return self._safe(lambda: self.sp.next_track())

    def _safe(self, fn) -> bool:
        if not self.configured:
            return False
        try:
            fn()
            return True
        except Exception as exc:
            log.warning("Spotify control failed: %s", exc)
            return False
