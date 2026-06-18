"""Voice layer — wake word, STT, TTS and the hands-free pipeline (Phase 2).

Planned structure (interfaces are stabilized now so other modules can depend on
them):

- ``wakeword``  : background listener for "Wake up Jarvis" (openWakeWord).
- ``stt``       : streaming speech-to-text (Deepgram, faster-whisper fallback).
- ``tts``       : text-to-speech with a British voice, interruptible
                  (ElevenLabs, Windows SAPI fallback). Honors speed/pitch.
- ``audio``     : microphone/speaker IO via sounddevice.
- ``pipeline``  : ties them together — wake → startup ritual → listen → respond.

Phase 1 ships no audio dependencies; importing :mod:`jarvis.voice.pipeline`
before Phase 2 raises, and the app falls back to text mode.
"""
