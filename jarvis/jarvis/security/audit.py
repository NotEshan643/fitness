"""Append-only audit log of every action and permission decision.

Separate from operational logging: this is the tamper-evident record of *what
JARVIS did on the user's behalf* — required by the security spec ("log all
actions").
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from ..core.logging import get_logger
from ..memory.database import Database

log = get_logger("security.audit")


class AuditLog:
    def __init__(self, db: Database) -> None:
        self.db = db

    def record(
        self,
        tool: str,
        args: dict[str, Any] | None,
        decision: str,
        result: str = "",
        actor: str = "jarvis",
        level: str = "info",
    ) -> None:
        try:
            self.db.conn.execute(
                "INSERT INTO audit_log(ts, actor, tool, args, decision, result, level)"
                " VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    datetime.now(timezone.utc).isoformat(),
                    actor,
                    tool,
                    json.dumps(args, default=str) if args else None,
                    decision,
                    result[:2000],
                    level,
                ),
            )
            self.db.conn.commit()
        except Exception:  # auditing must never crash an action
            log.exception("Failed to write audit entry for %s", tool)

    def tail(self, limit: int = 50) -> list[dict[str, Any]]:
        rows = self.db.conn.execute(
            "SELECT ts, actor, tool, decision, result, level FROM audit_log "
            "ORDER BY id DESC LIMIT ?",
            (limit,),
        ).fetchall()
        return [dict(r) for r in rows]
