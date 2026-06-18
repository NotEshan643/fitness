"""Startup chime for the wake ritual.

To avoid shipping binary assets, the chime is synthesized: a short, pleasant
two-note rising arpeggio with a soft fade — evocative of a HUD powering up. If a
user drops a ``startup.wav`` into the data dir, that is played instead.
"""

from __future__ import annotations

import numpy as np

from ..core.logging import get_logger
from ..core.paths import paths
from .audio import SAMPLE_RATE, Speaker

log = get_logger("voice.sounds")


def _synthesize_chime() -> np.ndarray:
    notes = [659.25, 987.77]  # E5 -> B5
    seg = 0.16
    out = []
    for i, freq in enumerate(notes):
        t = np.linspace(0, seg, int(SAMPLE_RATE * seg), endpoint=False)
        tone = 0.3 * np.sin(2 * np.pi * freq * t)
        tone += 0.1 * np.sin(2 * np.pi * freq * 2 * t)  # subtle overtone
        env = np.minimum(1.0, np.linspace(0, 1, t.size) * 8)  # quick attack
        env *= np.linspace(1.0, 0.0, t.size) ** 1.5           # smooth decay
        out.append(tone * env)
    wave = np.concatenate(out)
    return (wave / np.max(np.abs(wave)) * 0.6 * 32767).astype(np.int16)


def play_startup_sound(speaker: Speaker | None = None) -> None:
    speaker = speaker or Speaker()
    custom = paths.data_dir / "startup.wav"
    try:
        if custom.exists():
            import wave

            with wave.open(str(custom), "rb") as wf:
                frames = wf.readframes(wf.getnframes())
                samples = np.frombuffer(frames, dtype=np.int16)
                speaker.play(samples, sample_rate=wf.getframerate())
                return
        speaker.play(_synthesize_chime())
    except Exception:  # pragma: no cover - audio device dependent
        log.exception("Could not play startup sound")
