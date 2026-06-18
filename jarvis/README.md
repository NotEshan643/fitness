# JARVIS

> "Good morning, Sir. How may I assist you today?"

A production-grade personal AI assistant for Windows — voice-first, locally-run,
Claude-powered. Modeled on Iron Man's JARVIS: calm, witty, loyal, and capable of
real desktop control, web research, memory, and task automation.

This is a phased build. **Phase 1 (foundation) is implemented and runnable in
text mode today.** See [`ROADMAP.md`](ROADMAP.md) for what's next and
[`ARCHITECTURE.md`](ARCHITECTURE.md) for the design.

---

## Quick start

### 1. Install (Python 3.11+)
```bash
cd jarvis
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -e .              # or: pip install -r requirements.txt
```

### 2. Configure secrets
```bash
copy .env.example .env        # Windows  (cp on macOS/Linux)
```
Edit `.env` and set at minimum:
```
ANTHROPIC_API_KEY=sk-ant-...
```
Voice/Spotify/web keys are optional until those phases — JARVIS degrades
gracefully without them.

### 3. Run
```bash
python -m jarvis --text       # text conversation (works now)
python -m jarvis              # full voice mode (Phase 2+)
```
On Windows you can also double-click **`START-JARVIS.bat`**.

---

## What works in Phase 1
- Natural, in-character JARVIS conversation powered by Claude
- Persistent **memory**: conversation history + long-term facts (SQLite)
- **Agent loop** with native tool-use (Claude plans and calls tools)
- **Tools**: remember/recall/search/forget memory, current time, file search/read,
  web-search interface
- **Security**: permission tiers, confirmation for destructive actions, full audit log
- Layered **config** (YAML + `.env`) and structured **logging**

## Project layout
```
jarvis/
  jarvis/            Python package
    core/            config, logging, paths, event bus
    brain/           Claude client, persona, agent loop
    memory/          SQLite conversation + long-term memory
    tools/           desktop · system · files · web · spotify · memory
    voice/           wake word, STT, TTS, audio (Phase 2)
    scheduler/       recurring tasks (Phase 8)
    ui/              Iron-Man HUD dashboard (Phase 7)
    security/        permissions + audit
  config/            settings.yaml
  ARCHITECTURE.md  ROADMAP.md  SETTINGS.md
```

## Configuration
All behavior — wake phrase, voice, greeting style, assistant name, theme,
permissions, hotkeys — is configured in `config/settings.yaml`.
See [`SETTINGS.md`](SETTINGS.md).

## Privacy
All memory and logs stay on your machine (`%APPDATA%/JARVIS`). Cloud providers
(Claude, ElevenLabs, Deepgram) are used only for the request at hand; nothing
about you is persisted remotely.
