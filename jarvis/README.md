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

## What works now (Phases 1–2)
- Natural, in-character JARVIS conversation powered by Claude
- Persistent **memory**: conversation history + long-term facts (SQLite), with
  **semantic recall** (embeddings, optional) and **automatic fact extraction**
  so JARVIS quietly learns your preferences/goals over time
- **Agent loop** with native tool-use (Claude plans and calls tools)
- **Tools**: remember/recall/search/forget memory, current time, file search/read,
  web-search interface
- **Security**: permission tiers, confirmation for destructive actions, full audit log
- **Voice** (run `python -m jarvis`): wake word "Wake up Jarvis", startup ritual
  (chime → optional Spotify "Highway to Hell" → spoken greeting), hands-free
  listen→reason→speak loop, interruptible British TTS, voice confirmations.
  Cloud providers (ElevenLabs/Deepgram) with offline fallbacks (SAPI/Whisper).
- **Desktop & system control**: open/close apps & games, open websites, window
  list/focus, screenshots, file create/rename/move/delete (recycle bin),
  volume, media keys, system info/process monitor, and lock/sleep/restart/
  shutdown — destructive and power actions are confirmation-gated.
- **Internet research**: `web_search` + `get_news` (Tavily, with citations) and
  keyless `fetch_webpage` (fetch + readable-text extraction). The agent chains
  search→fetch→summarize for multi-step research on its own.
- **Spotify**: play tracks/playlists, pause/resume, skip, volume, now-playing
  ("Jarvis, play my workout playlist").
- **MCP integrations**: connect Google Calendar/Drive or any MCP server in
  `settings.integrations.mcp_servers` — their tools become voice-callable, with
  write actions auto-gated behind confirmation.
- Layered **config** (YAML + `.env`) and structured **logging**

> Voice needs the voice extras installed (`pip install -e .[voice]`) and a
> microphone. Without them, JARVIS automatically runs in text mode.

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
