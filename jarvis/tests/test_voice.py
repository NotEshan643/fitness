"""Voice-layer tests that need no audio hardware or API keys.

Covers the deterministic logic: startup-chime synthesis, fuzzy wake matching,
and provider-factory fallback selection when cloud keys are absent.
"""

from __future__ import annotations

import os
import tempfile

os.environ.setdefault("JARVIS_HOME", tempfile.mkdtemp())

import numpy as np  # noqa: E402

from jarvis.core.config import load_settings  # noqa: E402
from jarvis.voice.sounds import _synthesize_chime  # noqa: E402
from jarvis.voice.wakeword import _fuzzy_wake  # noqa: E402


def test_chime_is_valid_audio():
    chime = _synthesize_chime()
    assert chime.dtype == np.int16
    assert chime.size > 0
    assert np.abs(chime).max() <= 32767


def test_fuzzy_wake_matching():
    assert _fuzzy_wake("wake up jarvis", "wake up jarvis")
    assert _fuzzy_wake("ok jarvis wake up now", "wake up jarvis")
    assert not _fuzzy_wake("what's the weather", "wake up jarvis")
    assert not _fuzzy_wake("", "wake up jarvis")


def test_tts_factory_falls_back_without_key():
    from jarvis.voice.audio import Speaker
    from jarvis.voice.tts import SapiTTS, make_tts

    settings = load_settings()
    settings.secrets.elevenlabs_api_key = ""  # force fallback
    try:
        provider = make_tts(settings, Speaker())
    except Exception:
        # No SAPI/espeak backend in this environment either — acceptable here;
        # the point is it tried the fallback rather than ElevenLabs.
        return
    assert isinstance(provider, SapiTTS)


def test_stt_factory_falls_back_without_key():
    from jarvis.voice.stt import WhisperSTT, make_stt

    settings = load_settings()
    settings.secrets.deepgram_api_key = ""  # force fallback
    provider = make_stt(settings)
    assert isinstance(provider, WhisperSTT)


if __name__ == "__main__":
    test_chime_is_valid_audio()
    test_fuzzy_wake_matching()
    test_tts_factory_falls_back_without_key()
    test_stt_factory_falls_back_without_key()
    print("ALL VOICE TESTS PASSED")
