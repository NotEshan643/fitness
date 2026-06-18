"""Microphone capture and speaker playback.

Thin wrappers over :mod:`sounddevice` that the rest of the voice layer builds on.
We standardize on 16 kHz mono int16 — the format wake-word and STT engines
expect. Capture uses simple energy-based voice-activity detection (VAD) to slice
a single utterance; playback runs on a worker thread so it can be interrupted
(barge-in).

Audio deps are optional: importing this module without ``sounddevice``/``numpy``
raises, and the orchestrator falls back to text mode.
"""

from __future__ import annotations

import threading
from collections import deque

import numpy as np

from ..core.logging import get_logger

log = get_logger("voice.audio")


def _sd():
    """Lazy-import sounddevice so the module is importable without PortAudio
    (enables introspection/tests on machines with no audio backend)."""
    import sounddevice as sd

    return sd


SAMPLE_RATE = 16_000
CHANNELS = 1
DTYPE = "int16"
_FRAME_MS = 30
_FRAME = SAMPLE_RATE * _FRAME_MS // 1000  # samples per frame


def _rms(frame: np.ndarray) -> float:
    if frame.size == 0:
        return 0.0
    return float(np.sqrt(np.mean((frame.astype(np.float32) / 32768.0) ** 2)))


class Microphone:
    """Records utterances using energy VAD with leading/trailing padding."""

    def __init__(
        self,
        silence_threshold: float = 0.012,
        max_silence_ms: int = 800,
        max_utterance_s: float = 15.0,
        preroll_ms: int = 300,
    ) -> None:
        self.silence_threshold = silence_threshold
        self.max_silence_frames = max_silence_ms // _FRAME_MS
        self.max_frames = int(max_utterance_s * 1000) // _FRAME_MS
        self.preroll_frames = preroll_ms // _FRAME_MS

    def listen_utterance(self) -> np.ndarray:
        """Block until speech starts, then capture until trailing silence.

        Returns int16 mono samples (possibly empty if nothing was said before
        the overall timeout).
        """
        ring: deque[np.ndarray] = deque(maxlen=self.preroll_frames)
        captured: list[np.ndarray] = []
        speaking = False
        silence = 0

        with _sd().InputStream(
            samplerate=SAMPLE_RATE, channels=CHANNELS, dtype=DTYPE, blocksize=_FRAME
        ) as stream:
            for _ in range(self.max_frames + self.preroll_frames):
                data, _overflow = stream.read(_FRAME)
                frame = data.reshape(-1)
                loud = _rms(frame) >= self.silence_threshold

                if not speaking:
                    ring.append(frame)
                    if loud:
                        speaking = True
                        captured.extend(ring)  # include preroll
                        ring.clear()
                else:
                    captured.append(frame)
                    silence = 0 if loud else silence + 1
                    if silence >= self.max_silence_frames:
                        break

        if not captured:
            return np.zeros(0, dtype=np.int16)
        return np.concatenate(captured).astype(np.int16)

    def stream_frames(self):
        """Yield raw int16 frames continuously (used by the wake-word loop)."""
        with _sd().InputStream(
            samplerate=SAMPLE_RATE, channels=CHANNELS, dtype=DTYPE, blocksize=_FRAME
        ) as stream:
            while True:
                data, _ = stream.read(_FRAME)
                yield data.reshape(-1)


class Speaker:
    """Interruptible playback of int16 mono PCM."""

    def __init__(self) -> None:
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def play(self, samples: np.ndarray, sample_rate: int = SAMPLE_RATE, block: bool = True) -> None:
        self.stop()
        self._stop.clear()

        def _worker() -> None:
            sd=_sd()
            try:
                sd.play(samples, samplerate=sample_rate)
                while sd.get_stream().active:  # poll so we can interrupt
                    if self._stop.is_set():
                        sd.stop()
                        break
                    sd.sleep(50)
            except Exception:  # pragma: no cover - device dependent
                log.exception("Playback failed")

        self._thread = threading.Thread(target=_worker, daemon=True)
        self._thread.start()
        if block:
            self._thread.join()

    def stop(self) -> None:
        self._stop.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=1.0)

    @property
    def is_playing(self) -> bool:
        return self._thread is not None and self._thread.is_alive()
