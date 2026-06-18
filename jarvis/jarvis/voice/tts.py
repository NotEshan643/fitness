"""Text-to-speech with a provider abstraction and graceful fallback.

Default: ElevenLabs (natural British voice, the "JARVIS" timbre). Fallback:
Windows SAPI via pyttsx3 (offline, always available on Windows). The factory
picks per settings and downgrades automatically if the cloud provider is
unconfigured or its SDK is missing, so JARVIS always has a voice.

Speed/pitch from settings are honored where the backend supports them.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

import numpy as np

from ..core.config import Settings
from ..core.logging import get_logger
from .audio import Speaker

log = get_logger("voice.tts")

# A pleasant default British voice id on ElevenLabs (overridable in settings).
_DEFAULT_ELEVEN_VOICE = "George"


class TTSProvider(ABC):
    """Speaks text. ``speak`` blocks; ``stop`` enables barge-in interruption."""

    def __init__(self, settings: Settings, speaker: Speaker) -> None:
        self.settings = settings
        self.speaker = speaker

    @abstractmethod
    def speak(self, text: str) -> None: ...

    def stop(self) -> None:
        self.speaker.stop()

    @property
    def is_speaking(self) -> bool:
        return self.speaker.is_playing


class ElevenLabsTTS(TTSProvider):
    def __init__(self, settings: Settings, speaker: Speaker) -> None:
        super().__init__(settings, speaker)
        from elevenlabs.client import ElevenLabs

        self._client = ElevenLabs(api_key=settings.secrets.elevenlabs_api_key)
        self._voice = settings.voice.voice_id or _DEFAULT_ELEVEN_VOICE

    def speak(self, text: str) -> None:
        if not text.strip():
            return
        # Request PCM 16k so we can stream straight into the Speaker.
        audio = self._client.text_to_speech.convert(
            voice_id=self._voice,
            model_id="eleven_turbo_v2_5",
            text=text,
            output_format="pcm_16000",
            voice_settings={
                "stability": 0.5,
                "similarity_boost": 0.75,
                "speed": self.settings.voice.speed,
            },
        )
        pcm = b"".join(audio)
        samples = np.frombuffer(pcm, dtype=np.int16)
        self.speaker.play(samples, sample_rate=16_000, block=True)


class SapiTTS(TTSProvider):
    """Offline fallback using the OS speech engine (Windows SAPI / espeak)."""

    def __init__(self, settings: Settings, speaker: Speaker) -> None:
        super().__init__(settings, speaker)
        import pyttsx3

        self._engine = pyttsx3.init()
        base_rate = self._engine.getProperty("rate")
        self._engine.setProperty("rate", int(base_rate * settings.voice.speed))
        # Prefer a British/female-neutral voice if present.
        for v in self._engine.getProperty("voices"):
            if "en-gb" in (getattr(v, "id", "") or "").lower() or "british" in (v.name or "").lower():
                self._engine.setProperty("voice", v.id)
                break

    def speak(self, text: str) -> None:
        if not text.strip():
            return
        self._engine.say(text)
        self._engine.runAndWait()

    def stop(self) -> None:
        try:
            self._engine.stop()
        except Exception:  # pragma: no cover
            pass


def make_tts(settings: Settings, speaker: Speaker) -> TTSProvider:
    """Build the configured TTS provider, falling back to SAPI on any problem."""
    want = settings.voice.tts_provider
    if want == "elevenlabs" and settings.secrets.elevenlabs_api_key:
        try:
            return ElevenLabsTTS(settings, speaker)
        except Exception as exc:
            log.warning("ElevenLabs unavailable (%s); falling back to SAPI", exc)
    try:
        return SapiTTS(settings, speaker)
    except Exception as exc:  # pragma: no cover
        log.error("No TTS backend available: %s", exc)
        raise
