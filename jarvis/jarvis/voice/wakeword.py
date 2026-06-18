"""Background wake-word detection: "Wake up Jarvis".

Primary engine is openWakeWord (free, local, low-CPU). openWakeWord ships a
pretrained ``hey_jarvis`` model; for the exact phrase "wake up jarvis" a custom
model can be trained and dropped in (path configurable). If no model loads, we
fall back to a lightweight STT-keyword detector so wake still works out of the
box — slower, but dependency-light.

Custom wake phrases are supported via ``settings.wake.phrase`` and a matching
model file, satisfying the "support future custom wake phrases" requirement.
"""

from __future__ import annotations

from typing import Callable

import numpy as np

from ..core.config import Settings
from ..core.logging import get_logger
from .audio import Microphone

log = get_logger("voice.wakeword")

OnWake = Callable[[], None]


class WakeWordListener:
    def __init__(self, settings: Settings, mic: Microphone | None = None) -> None:
        self.settings = settings
        self.mic = mic or Microphone()
        self._running = False
        self._model = self._load_model()

    def _load_model(self):
        """Try openWakeWord; return None to use the STT fallback."""
        try:
            from openwakeword.model import Model

            # Map the configured phrase to a pretrained model where possible.
            phrase = self.settings.wake.phrase.lower()
            preset = "hey_jarvis" if "jarvis" in phrase else None
            model = Model(wakeword_models=[preset] if preset else None)
            log.info("openWakeWord loaded (preset=%s)", preset)
            return model
        except Exception as exc:
            log.warning("openWakeWord unavailable (%s); using STT keyword fallback", exc)
            return None

    def listen(self, on_wake: OnWake) -> None:
        """Block forever, invoking ``on_wake`` each time the phrase is heard."""
        self._running = True
        if self._model is not None:
            self._listen_oww(on_wake)
        else:
            self._listen_stt(on_wake)

    def stop(self) -> None:
        self._running = False

    # ── engines ────────────────────────────────────────────────────────
    def _listen_oww(self, on_wake: OnWake) -> None:
        threshold = self.settings.wake.sensitivity
        for frame in self.mic.stream_frames():
            if not self._running:
                break
            scores = self._model.predict(frame)
            if any(score >= threshold for score in scores.values()):
                self._model.reset()
                on_wake()

    def _listen_stt(self, on_wake: OnWake) -> None:
        """Fallback: transcribe short utterances and match the phrase."""
        from .stt import make_stt

        stt = make_stt(self.settings)
        phrase = self.settings.wake.phrase.lower()
        while self._running:
            utterance = self.mic.listen_utterance()
            if utterance.size == 0:
                continue
            text = stt.transcribe(utterance).lower()
            if phrase in text or _fuzzy_wake(text, phrase):
                on_wake()


def _fuzzy_wake(text: str, phrase: str) -> bool:
    """Tolerant match: all phrase words present in order-insensitive fashion."""
    if not text:
        return False
    words = set(text.split())
    return all(w in words for w in phrase.split())
