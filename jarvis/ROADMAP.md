# JARVIS — Development Roadmap

Phased build with approval gates between major phases, as requested. Each phase
is independently shippable and leaves JARVIS in a working state.

---

## ✅ Phase 1 — Foundation (this commit)
The skeleton that everything else plugs into.

- [x] Architecture, roadmap, settings docs
- [x] Project scaffold (`pyproject.toml`, `requirements.txt`, `.env.example`,
      `START-JARVIS.bat`)
- [x] `core`: config (YAML + pydantic), logging, app paths, event bus
- [x] `memory`: SQLite database, schema, conversation + long-term stores w/ CRUD & search
- [x] `brain`: Claude client wrapper, JARVIS persona, agent tool-use loop
- [x] `security`: permission tiers, confirmation contract, audit log
- [x] `tools`: registry + base + initial real tools (memory, time, files, web stub)
- [x] `app.py` orchestrator + `__main__` entry (text REPL mode runs today)

**Runnable today:** `python -m jarvis --text` → a fully conversational,
memory-backed, tool-using JARVIS in the terminal (needs `ANTHROPIC_API_KEY`).

---

## ✅ Phase 2 — Voice (the JARVIS feel)
- [x] Wake word "Wake up Jarvis" (openWakeWord, STT-keyword fallback)
- [x] STT (Deepgram → faster-whisper fallback) behind a provider interface
- [x] TTS (ElevenLabs British voice → Windows SAPI fallback), speed/pitch, interruptible
- [x] Audio IO with energy-VAD utterance capture + barge-in playback
- [x] Startup ritual: synthesized chime → optional Spotify "Highway to Hell" → time-aware greeting
- [x] Full hands-free pipeline: wake → ritual → listen → reason → speak → sleep
- [x] Voice-driven confirmation for destructive actions
- [x] Unit tests (no audio hw needed): chime, fuzzy wake, provider fallbacks

> Audio runtime behavior must be verified on the user's Windows PC (mic/speaker
> + API keys); logic and fallbacks are import-tested here.

## ✅ Phase 3 — Desktop & system control
- [x] Open/launch apps & games, close processes, open websites (cross-platform)
- [x] Window management (list/focus) and screen capture
- [x] File ops: create/rename/move/delete — confirm-gated, delete to recycle bin
- [x] Volume, media keys (play/pause/next/prev/mute)
- [x] Lock (confirm) and sleep/restart/shutdown (sensitive + allow_shutdown gate)
- [x] System info + top-process monitoring (psutil)
- [x] Tests: file-op lifecycle on disk + destructive/power permission gating

> 26 tools now registered. Windows-specific actions (pycaw volume, power cmds)
> verified by reading + platform guards; run-test on the user's Windows PC.

## ✅ Phase 4 — Internet & agentic research
- [x] `web_search` (Tavily) with synthesized answer + sources to cite
- [x] `get_news` recent-news briefing over a configurable window
- [x] `fetch_webpage` — keyless fetch + readable-text extraction (trafilatura,
      with a tag-stripping fallback) so any page can be read/summarized
- [x] Multi-step research emerges from the agent loop (search → fetch → synthesize)
- [x] Tests: HTML extraction (scripts/styles/tags removed) + no-key degradation

> Live search needs TAVILY_API_KEY; page fetching works with internet only.
> Structured outputs (spreadsheets) build on this in a later pass.

## Phase 5 — Memory intelligence
- Embeddings + vector recall over long-term memory
- Automatic fact extraction from conversations
- Memory review/merge UI

## Phase 6 — Spotify & integrations
- Full Spotify control (play/pause/skip/volume/playlists, OAuth)
- Google Calendar / Drive bridges (MCP)

## Phase 7 — HUD dashboard
- PySide6 Iron-Man HUD: status, mic state, transcript, memory, tasks, sysinfo
- System tray, hotkeys, notifications

## Phase 8 — Automation & hardening
- Recurring tasks (morning briefing, reminders) via scheduler
- Packaging (PyInstaller), autostart, settings UI, tests, error reporting

---

### Approval gates
After each phase I pause, summarize what changed, and wait for your go-ahead
before starting the next. You can reorder phases at any gate.
