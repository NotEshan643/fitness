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

## ✅ Phase 5 — Memory intelligence
- [x] Pluggable embeddings (Voyage AI → local sentence-transformers → none)
- [x] Semantic recall via brute-force cosine over the BLOB column; keyword (FTS)
      fallback when no embedder; backfill of pre-existing memories on startup
- [x] Per-turn relevant-memory injection (semantic when available)
- [x] Automatic fact extraction (background, cheap model) with dedup
- [x] Tests: semantic ranking, near-duplicate detection, extractor + dedup
- [ ] Memory review/merge UI → folds into Phase 7 (HUD)

> Semantic recall is optional: VOYAGE_API_KEY or `pip install -e .[memory]`.
> Without either, keyword recall keeps working.

## ✅ Phase 6 — Spotify & integrations
- [x] Full Spotify control: play track/playlist, pause/resume, next/previous,
      volume, now-playing (OAuth via spotipy, cached single controller)
- [x] Generic MCP bridge: any configured MCP server's tools auto-register
      (Google Calendar/Drive/etc.) via a sync↔async loop bridge
- [x] Automatic permission gating of MCP tools (mutating verbs → confirm)
- [x] Tests: Spotify registration/degradation, MCP risk heuristic, bridge no-op
      without servers / missing package

> Spotify needs SPOTIFY_CLIENT_ID/SECRET (Premium). MCP servers are configured
> in settings.integrations.mcp_servers and need `pip install -e .[integrations]`.

## ✅ Phase 7 — HUD dashboard
- [x] PySide6 Iron-Man HUD: status/mic state, live transcript (+ text input),
      memory browser/editor, tool/activity feed, live system info
- [x] Thread-safe event-bus → Qt-signal bridge (worker threads update the GUI)
- [x] System tray (painted arc-reactor icon) with show/hide + power-down;
      optional background voice loop; `python -m jarvis --ui`
- [x] Qt-free theme layer (palette + QSS) with tests
- [ ] Global OS hotkey toggle → Phase 8 (needs platform hook)

> HUD needs the `ui` extra (PySide6). Rendering is verified on the user's PC;
> logic/theme are import- and unit-tested headless here.

## ✅ Phase 8 — Automation & hardening
- [x] Recurring tasks via APScheduler, persisted in SQLite and reloaded on start
- [x] Jobs run through the Agent and announce results (spoken + HUD notify)
- [x] schedule_task / list_tasks / cancel_task tools (voice-schedulable)
- [x] Global hotkey to toggle the HUD (pynput, optional)
- [x] Packaging + autostart guide (PACKAGING.md: PyInstaller, Startup/Task Scheduler)
- [x] Test suite across all 8 phases (38 tools registered)

---

## 🎉 All planned phases complete
Future polish (not blocking): vector memory UI, streaming STT partials, richer
HUD widgets, error reporting/telemetry, more first-party integrations.

---

### Approval gates
After each phase I pause, summarize what changed, and wait for your go-ahead
before starting the next. You can reorder phases at any gate.
