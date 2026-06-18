"""Rolling conversation transcript across sessions.

The brain reconstructs short-term context from the most recent messages of the
active conversation, so JARVIS "remembers previous discussions" even after a
restart.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from .database import Database


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class ConversationStore:
    def __init__(self, db: Database) -> None:
        self.db = db
        self.conversation_id: int | None = None

    def start(self, title: str | None = None) -> int:
        cur = self.db.conn.execute(
            "INSERT INTO conversations(started_at, title) VALUES (?, ?)",
            (_now(), title),
        )
        self.db.conn.commit()
        self.conversation_id = int(cur.lastrowid)
        return self.conversation_id

    def _ensure(self) -> int:
        if self.conversation_id is None:
            self.start()
        assert self.conversation_id is not None
        return self.conversation_id

    def add(
        self,
        role: str,
        content: str,
        tool_calls: list[dict[str, Any]] | None = None,
    ) -> None:
        self.db.conn.execute(
            "INSERT INTO messages(conversation_id, role, content, tool_calls, created_at)"
            " VALUES (?, ?, ?, ?, ?)",
            (
                self._ensure(),
                role,
                content,
                json.dumps(tool_calls) if tool_calls else None,
                _now(),
            ),
        )
        self.db.conn.commit()

    def recent(self, limit: int = 20) -> list[dict[str, str]]:
        """Return the last ``limit`` user/assistant turns, oldest first.

        Tool rows are excluded — the brain rebuilds tool context within a single
        turn; across turns only the human-readable exchange matters.
        """
        rows = self.db.conn.execute(
            "SELECT role, content FROM messages "
            "WHERE conversation_id = ? AND role IN ('user','assistant') "
            "ORDER BY id DESC LIMIT ?",
            (self._ensure(), limit),
        ).fetchall()
        return [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]

    def end(self) -> None:
        if self.conversation_id is not None:
            self.db.conn.execute(
                "UPDATE conversations SET ended_at = ? WHERE id = ?",
                (_now(), self.conversation_id),
            )
            self.db.conn.commit()
