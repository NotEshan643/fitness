"""The hands-free voice loop — what makes it feel like JARVIS.

Lifecycle:
    1. Idle: a background wake-word listener waits for "Wake up Jarvis".
    2. On wake, run the startup ritual: chime → optional Spotify "Highway to
       Hell" → a time-aware spoken greeting.
    3. Active session: listen → transcribe → reason (the same Agent as text
       mode) → speak. Destructive actions are confirmed by voice.
    4. After a stretch of silence, return to idle and await the wake word again.

Speech is interruptible (barge-in): if the user starts talking while JARVIS is
speaking, playback stops and we listen.

This module imports audio dependencies at load time; if they're missing the
orchestrator catches the ImportError and falls back to text mode.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from ..brain.persona import time_greeting
from ..core.logging import get_logger
from .audio import Microphone, Speaker
from .sounds import play_startup_sound
from .stt import make_stt
from .tts import make_tts
from .wakeword import WakeWordListener

if TYPE_CHECKING:
    from ..app import JarvisApp

log = get_logger("voice.pipeline")

_EXIT_PHRASES = {"goodbye jarvis", "power down", "go to sleep", "that's all jarvis"}
_AFFIRMATIVE = {"yes", "yeah", "yep", "do it", "confirm", "go ahead", "please do", "affirmative"}


class VoicePipeline:
    def __init__(self, app: "JarvisApp") -> None:
        self.app = app
        self.settings = app.settings
        self.mic = Microphone()
        self.speaker = Speaker()
        self.tts = make_tts(self.settings, self.speaker)
        self.stt = make_stt(self.settings)
        self.wake = WakeWordListener(self.settings, self.mic)
        self.spotify = None

    # ── public ─────────────────────────────────────────────────────────
    def run(self) -> None:
        addr = self.settings.assistant.address_user_as
        print(f"\n  {self.settings.assistant.name} is listening for "
              f"\"{self.settings.wake.phrase}\"…  (Ctrl+C to quit)\n")
        self.app.events.emit("state", state="listening_for_wake")
        try:
            if self.settings.wake.enabled:
                self.wake.listen(on_wake=self._on_wake)
            else:
                # Wake disabled → go straight into a session.
                self._on_wake()
        except KeyboardInterrupt:
            pass
        finally:
            self.app.shutdown()
            print(f"\n  Powering down. Goodbye, {addr}.\n")

    # ── ritual + session ───────────────────────────────────────────────
    def _on_wake(self) -> None:
        self.app.events.emit("state", state="waking")
        self._startup_ritual()
        self._session()
        self.app.events.emit("state", state="listening_for_wake")

    def _startup_ritual(self) -> None:
        s = self.settings.startup
        if s.sound:
            play_startup_sound(self.speaker)
        if s.play_highway_to_hell:
            self._play_highway_to_hell()
        if s.greet:
            self.speak(time_greeting(self.settings))

    def _play_highway_to_hell(self) -> None:
        try:
            from ..tools.spotify import get_controller

            self.spotify = get_controller(self.settings)
            self.spotify.play_query("Highway to Hell AC/DC")
        except Exception:  # never let music break the ritual
            log.exception("Could not start startup music")

    def _session(self) -> None:
        self.app.conversation.start()
        idle_rounds = 0
        while True:
            self.app.events.emit("state", state="listening")
            utterance = self.mic.listen_utterance()
            text = self.stt.transcribe(utterance).strip()
            if not text:
                idle_rounds += 1
                if idle_rounds >= 2:  # ~two silences → back to sleep
                    return
                continue
            idle_rounds = 0

            lowered = text.lower().strip(" .!?")
            if lowered in _EXIT_PHRASES:
                self.speak(f"Very good, {self.settings.assistant.address_user_as}.")
                return

            self.app.events.emit("transcript", role="user", text=text)
            self.app.events.emit("state", state="thinking")
            reply = self.app.agent.respond(text, confirm=self._voice_confirm)
            self.speak(reply)

    # ── speech ─────────────────────────────────────────────────────────
    def speak(self, text: str) -> None:
        if not text.strip():
            return
        self.app.events.emit("state", state="speaking")
        self.app.events.emit("transcript", role="assistant", text=text)
        self.tts.speak(text)

    def _voice_confirm(self, summary: str) -> bool:
        """Ask for confirmation aloud and listen for a yes/no."""
        addr = self.settings.assistant.address_user_as
        self.speak(f"That will {summary}, {addr}. Shall I proceed?")
        answer = self.stt.transcribe(self.mic.listen_utterance()).lower()
        return any(word in answer for word in _AFFIRMATIVE)
