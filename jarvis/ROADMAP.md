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

## Phase 2 — Voice (the JARVIS feel)  ⟵ *next, pending approval*
- Wake word "Wake up Jarvis" (openWakeWord) running in background
- Streaming STT (Deepgram) + barge-in / interruptible TTS (ElevenLabs British voice)
- Startup ritual: sound → optional Spotify "Highway to Hell" → time-aware greeting
- Full hands-free voice loop; adjustable speed/pitch; local fallbacks

## Phase 3 — Desktop & system control
- Open/close apps & games, window management, screenshots
- File ops (create/rename/move/delete/search) — all confirm-gated
- Volume, media keys, lock / sleep / restart / shutdown (sensitive-gated)
- Running-process monitoring

## Phase 4 — Internet & agentic research
- Pluggable web search + page extraction + summarization with citations
- Multi-step research tasks → structured outputs (notes, spreadsheets)
- News/market briefings

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
