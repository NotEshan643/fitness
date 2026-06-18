"""Speech-to-text with a provider abstraction and graceful fallback.

Default: Deepgram (fast, accurate cloud transcription). Fallback:
faster-whisper running locally (private, offline). Both consume a captured
int16 utterance from the microphone and return text; the factory picks per
settings and downgrades when the cloud provider is unconfigured.

Deepgram also supports true streaming; for a clean Phase-2 baseline we transcribe
a VAD-sliced utterance (low latency, simple, robust). Streaming partials can be
layered on later without changing this interface.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

import numpy as np

from ..core.config import Settings
from ..core.logging import get_logger

log = get_logger("voice.stt")


def _pcm_bytes(samples: np.ndarray) -> bytes:
    return samples.astype(np.int16).tobytes()


class STTProvider(ABC):
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    @abstractmethod
    def transcribe(self, samples: np.ndarray, sample_rate: int = 16_000) -> str: ...


class DeepgramSTT(STTProvider):
    def __init__(self, settings: Settings) -> None:
        super().__init__(settings)
        from deepgram import DeepgramClient

        self._client = DeepgramClient(settings.secrets.deepgram_api_key)

    def transcribe(self, samples: np.ndarray, sample_rate: int = 16_000) -> str:
        if samples.size == 0:
            return ""
        from deepgram import PrerecordedOptions

        source = {"buffer": _pcm_bytes(samples), "mimetype": "audio/raw"}
        options = PrerecordedOptions(
            model="nova-2",
            language="en",
            encoding="linear16",
            sample_rate=sample_rate,
            smart_format=True,
        )
        resp = self._client.listen.rest.v("1").transcribe_file(source, options)
        try:
            return resp.results.channels[0].alternatives[0].transcript.strip()
        except Exception:
            log.warning("Deepgram returned no transcript")
            return ""


class WhisperSTT(STTProvider):
    """Local fallback. Lazily loads the model on first use."""

    _model = None

    def __init__(self, settings: Settings) -> None:
        super().__init__(settings)

    def _ensure_model(self):
        if WhisperSTT._model is None:
            from faster_whisper import WhisperModel

            WhisperSTT._model = WhisperModel("base.en", device="auto", compute_type="int8")
        return WhisperSTT._model

    def transcribe(self, samples: np.ndarray, sample_rate: int = 16_000) -> str:
        if samples.size == 0:
            return ""
        model = self._ensure_model()
        audio = samples.astype(np.float32) / 32768.0
        segments, _ = model.transcribe(audio, language="en", vad_filter=True)
        return " ".join(seg.text for seg in segments).strip()


def make_stt(settings: Settings) -> STTProvider:
    want = settings.voice.stt_provider
    if want == "deepgram" and settings.secrets.deepgram_api_key:
        try:
            return DeepgramSTT(settings)
        except Exception as exc:
            log.warning("Deepgram unavailable (%s); falling back to local Whisper", exc)
    try:
        return WhisperSTT(settings)
    except Exception as exc:  # pragma: no cover
        log.error("No STT backend available: %s", exc)
        raise
