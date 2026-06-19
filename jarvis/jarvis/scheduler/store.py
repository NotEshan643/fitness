"""Persistence for scheduled tasks (SQLite-backed CRUD)."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from ..memory.database import Database


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class ScheduledTask:
    id: int
    name: str
    prompt: str
    trigger: str            # "cron" | "interval"
    schedule: dict[str, Any]
    enabled: bool
    speak: bool
    last_run: str | None = None

    @classmethod
    def from_row(cls, row) -> "ScheduledTask":
        return cls(
            id=row["id"],
            name=row["name"],
            prompt=row["prompt"],
            trigger=row["trigger"],
            schedule=json.loads(row["schedule"]),
            enabled=bool(row["enabled"]),
            speak=bool(row["speak"]),
            last_run=row["last_run"],
        )


class TaskStore:
    def __init__(self, db: Database) -> None:
        self.db = db

    def add(
        self,
        name: str,
        prompt: str,
        trigger: str,
        schedule: dict[str, Any],
        speak: bool = True,
    ) -> int:
        cur = self.db.conn.execute(
            "INSERT INTO scheduled_tasks(name, prompt, trigger, schedule, enabled, speak, created_at)"
            " VALUES (?, ?, ?, ?, 1, ?, ?)",
            (name, prompt, trigger, json.dumps(schedule), int(speak), _now()),
        )
        self.db.conn.commit()
        return int(cur.lastrowid)

    def all(self, enabled_only: bool = False) -> list[ScheduledTask]:
        sql = "SELECT * FROM scheduled_tasks"
        if enabled_only:
            sql += " WHERE enabled = 1"
        sql += " ORDER BY id"
        return [ScheduledTask.from_row(r) for r in self.db.conn.execute(sql).fetchall()]

    def get(self, task_id: int) -> ScheduledTask | None:
        row = self.db.conn.execute(
            "SELECT * FROM scheduled_tasks WHERE id = ?", (task_id,)
        ).fetchone()
        return ScheduledTask.from_row(row) if row else None

    def remove(self, task_id: int) -> bool:
        cur = self.db.conn.execute("DELETE FROM scheduled_tasks WHERE id = ?", (task_id,))
        self.db.conn.commit()
        return cur.rowcount > 0

    def mark_run(self, task_id: int) -> None:
        self.db.conn.execute(
            "UPDATE scheduled_tasks SET last_run = ? WHERE id = ?", (_now(), task_id)
        )
        self.db.conn.commit()
