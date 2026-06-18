"""SQLite connection management and schema migration.

One :class:`Database` instance owns a single connection (SQLite handles our
single-process access fine in WAL mode). Stores receive the connection rather
than opening their own, so transactions and pragmas stay consistent.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path

from ..core.logging import get_logger
from ..core.paths import paths

log = get_logger("memory.db")

_SCHEMA = Path(__file__).with_name("schema.sql")


class Database:
    def __init__(self, db_path: Path | None = None) -> None:
        self.path = db_path or paths.db_path
        self.conn = sqlite3.connect(self.path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA foreign_keys = ON;")
        self._migrate()
        log.info("Database ready at %s", self.path)

    def _migrate(self) -> None:
        self.conn.executescript(_SCHEMA.read_text(encoding="utf-8"))
        self.conn.commit()

    def close(self) -> None:
        try:
            self.conn.commit()
            self.conn.close()
        except Exception:  # pragma: no cover
            log.exception("Error closing database")
