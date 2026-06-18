# JARVIS — Architecture

A production-grade personal AI assistant for Windows. Modular, locally-run,
voice-first, with a Claude-powered reasoning core.

---

## 1. Design principles

1. **Modular & independently maintainable** — every capability (voice, memory,
   desktop control, web, etc.) is a self-contained package with a narrow public
   interface. Modules talk through an event bus and a shared service container,
   never by reaching into each other's internals.
2. **Safe by default** — destructive or sensitive actions pass through a
   permission layer and are written to an audit log. Nothing irreversible
   happens without an explicit confirmation contract.
3. **Provider-abstracted** — STT, TTS, wake word, web search and the LLM are all
   behind interfaces. The "Cloud-HQ" providers are the default; local/offline
   providers are drop-in fallbacks selected via config.
4. **Local-first state** — all memory and logs live on disk (SQLite + files) in
   the user's app-data directory. Nothing about the user is stored remotely.
5. **Fail soft** — a missing API key or device degrades one capability, it does
   not crash JARVIS. The assistant always reports what it cannot currently do.

---

## 2. High-level architecture

```
                       ┌──────────────────────────────────────────┐
                       │                  UI layer                  │
                       │   PySide6 HUD dashboard + system tray      │
                       └───────────────▲───────────────▲───────────┘
                                       │ events        │ commands
┌───────────────┐   audio   ┌──────────┴───────┐   ┌───┴────────────┐
│  Voice layer  │──────────▶│   Application    │◀──│  Scheduler     │
│ wake/STT/TTS  │◀──────────│   orchestrator   │   │ (recurring)    │
└───────────────┘  speech   │   (app.py)       │   └────────────────┘
                            └───┬─────────┬────┘
                                │         │
                     ┌──────────▼──┐   ┌──▼───────────────┐
                     │   Brain     │   │   Memory         │
                     │ Claude LLM  │◀─▶│ SQLite: convo +  │
                     │ + Agent loop│   │ long-term store  │
                     └──────┬──────┘   └──────────────────┘
                            │ tool calls
              ┌─────────────▼──────────────────────────────┐
              │              Tool registry                  │
              │  desktop · system · files · web · spotify · │
              │  memory · scheduler   (each permission-gated)│
              └─────────────┬──────────────────────────────┘
                            │
                     ┌──────▼───────┐
                     │  Security    │
                     │ permissions  │
                     │ + audit log  │
                     └──────────────┘
```

### Flow of a spoken command
1. **Wake word** (`voice.wakeword`) detects "Wake up Jarvis" → emits `wake`.
2. Orchestrator runs the **startup ritual**: startup sound → optional Spotify
   "Highway to Hell" → time-aware greeting via TTS.
3. **STT** streams the user's speech → text.
4. The **Brain** builds a prompt from: persona + relevant long-term memory +
   recent conversation + the user message, then runs the **agent loop**.
5. The agent loop lets Claude call **tools**. Each tool checks **permissions**;
   destructive ones request voice/UI confirmation. Every call is **audited**.
6. The final answer is **spoken** (TTS, interruptible) and shown in the HUD.
7. The exchange is persisted to **conversation memory**; durable facts are
   extracted into **long-term memory**.

---

## 3. Module map

| Module            | Responsibility                                              | Key deps |
|-------------------|-------------------------------------------------------------|----------|
| `core`            | config, logging, paths, event bus, service container        | pydantic |
| `brain`           | Claude client, persona, agent (tool-use) loop               | anthropic |
| `memory`          | SQLite conversation history + long-term memory CRUD/search  | sqlite3  |
| `tools`           | the assistant's "hands": desktop, system, files, web, music | various  |
| `voice`           | wake word, STT, TTS, audio IO, full voice pipeline          | sounddevice, deepgram, elevenlabs, openwakeword |
| `scheduler`       | recurring tasks (briefings, reminders) via APScheduler      | apscheduler |
| `ui`              | Iron-Man-HUD dashboard + system tray                        | PySide6  |
| `security`        | permission layers + confirmation + audit logging            | stdlib   |

Each module exposes a small `__init__.py` public API and is constructed by the
orchestrator, which injects shared services (config, memory, event bus).

---

## 4. Technology stack

- **Language:** Python 3.11+
- **Reasoning core:** Claude API (`anthropic` SDK) — native tool-use drives the
  agent loop and multi-step task decomposition.
- **Speech-to-text:** Deepgram streaming (default) → `faster-whisper` (local fallback)
- **Text-to-speech:** ElevenLabs (British voice, default) → Windows SAPI via
  `pyttsx3` (offline fallback)
- **Wake word:** `openWakeWord` (free, local) → STT-keyword fallback
- **Desktop control:** `pyautogui`, `psutil`, `pygetwindow`, `mss`, `pycaw`
- **Music:** `spotipy` (Spotify Web API)
- **Web research:** `httpx` + pluggable search (Tavily/Brave) + `trafilatura`
- **Scheduling:** `APScheduler`
- **UI:** `PySide6` (Qt) with a custom dark HUD theme
- **Storage:** SQLite (stdlib `sqlite3`) for memory; rotating files for logs
- **Config:** YAML + `pydantic` settings models; secrets via `.env`

> Rationale: an all-Python stack keeps the system single-process and easy to
> maintain on Windows, while Qt gives a native, GPU-free HUD. Cloud providers
> are chosen for quality/latency with local fallbacks so JARVIS still works
> offline in a degraded mode.

---

## 5. Data & memory design

Two SQLite stores in one database file (`%APPDATA%/JARVIS/jarvis.db`):

### Conversation memory (`conversations`, `messages`)
Rolling transcript across sessions. Used to rebuild short-term context.
```
conversations(id, started_at, ended_at, title)
messages(id, conversation_id, role, content, tool_calls, created_at)
```

### Long-term memory (`memories`)
Durable facts the assistant should recall indefinitely.
```
memories(
  id, kind, key, value, importance,
  source, created_at, updated_at, last_used_at, use_count, embedding
)
```
- `kind` ∈ {preference, goal, project, app, routine, instruction, fact, contact}
- Retrieval: keyword + recency + importance now; **vector search** (the
  `embedding` column) is wired for Phase 5.
- Full CRUD: remember / recall / search / update / forget — exposed both as
  tools (so JARVIS can self-manage memory) and in the UI.

### Audit log (`audit_log`)
```
audit_log(id, ts, actor, tool, args, decision, result, level)
```
Every tool invocation and permission decision, append-only.

---

## 6. Agent framework

The brain runs a bounded **tool-use loop** on top of Claude:

```
build messages (persona + memory + history + user turn)
loop up to MAX_STEPS:
    response = claude.messages(tools=registry.schemas())
    if response has tool_use:
        for each tool call:
            tool = registry.get(name)
            if tool.destructive: require_confirmation()
            result = tool.run(**args)        # permission-checked + audited
            append tool_result
        continue
    else:
        return response.text                 # final answer
```

- **Tools** are declared with JSON schemas (`tools/registry.py`) so Claude can
  call them natively. Adding a capability = adding one `Tool`.
- **Multi-step tasks** ("research competitors and build a spreadsheet") emerge
  naturally from the loop — Claude plans, calls tools, observes, continues.
- **Permissions**: each tool has a risk level; `destructive`/`sensitive` tools
  trigger a confirmation contract before execution.

---

## 7. Security model

- **Permission tiers:** `safe` (read-only/idempotent) · `confirm` (writes) ·
  `sensitive` (system/network/purchases). Configurable per-tool in settings.
- **Confirmation contract:** destructive tools return a *pending* action that
  must be confirmed by voice ("Confirm, Sir?") or the HUD before running.
- **Audit:** append-only log of every action and decision.
- **No silent escalation:** tools cannot widen their own permissions.

---

## 8. Configuration

`config/settings.yaml` (user-editable) layered over built-in defaults and
validated by pydantic. Secrets (API keys) live in `.env` and are never written
to the YAML or logs. See `SETTINGS.md` for every option.
