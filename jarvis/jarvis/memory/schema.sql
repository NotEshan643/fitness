-- JARVIS database schema. Applied idempotently on startup.
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ── Conversation history ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at  TEXT NOT NULL,
    ended_at    TEXT,
    title       TEXT
);

CREATE TABLE IF NOT EXISTS messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role            TEXT NOT NULL,          -- user | assistant | tool
    content         TEXT NOT NULL,
    tool_calls      TEXT,                   -- JSON, nullable
    created_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, id);

-- ── Long-term memory ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS memories (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    kind         TEXT NOT NULL,             -- preference|goal|project|app|routine|instruction|fact|contact
    key          TEXT,                      -- short label, optional
    value        TEXT NOT NULL,             -- the remembered content
    importance   INTEGER NOT NULL DEFAULT 3,-- 1..5
    source       TEXT,                      -- where it came from
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL,
    last_used_at TEXT,
    use_count    INTEGER NOT NULL DEFAULT 0,
    embedding    BLOB                       -- reserved for Phase 5 vector recall
);
CREATE INDEX IF NOT EXISTS idx_memories_kind ON memories(kind);

-- Full-text search over memory values (keyword recall until vectors land).
CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts
    USING fts5(value, key, content='memories', content_rowid='id');

CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
    INSERT INTO memories_fts(rowid, value, key) VALUES (new.id, new.value, new.key);
END;
CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
    INSERT INTO memories_fts(memories_fts, rowid, value, key)
        VALUES('delete', old.id, old.value, old.key);
END;
CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
    INSERT INTO memories_fts(memories_fts, rowid, value, key)
        VALUES('delete', old.id, old.value, old.key);
    INSERT INTO memories_fts(rowid, value, key) VALUES (new.id, new.value, new.key);
END;

-- ── Audit log (owned by security.audit) ───────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    ts       TEXT NOT NULL,
    actor    TEXT NOT NULL,                 -- jarvis | user | scheduler
    tool     TEXT NOT NULL,
    args     TEXT,                          -- JSON
    decision TEXT NOT NULL,                 -- allowed | confirmed | denied
    result   TEXT,
    level    TEXT NOT NULL DEFAULT 'info'   -- info | warning | error
);
CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log(ts);

-- ── Scheduled tasks (recurring jobs) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    prompt     TEXT NOT NULL,             -- instruction handed to the agent
    trigger    TEXT NOT NULL,             -- cron | interval
    schedule   TEXT NOT NULL,             -- JSON trigger kwargs
    enabled    INTEGER NOT NULL DEFAULT 1,
    speak      INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    last_run   TEXT
);
