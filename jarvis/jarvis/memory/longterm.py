"""Long-term memory: durable facts JARVIS should recall indefinitely.

Full CRUD plus keyword search (SQLite FTS5). The ``embedding`` column is in the
schema so Phase 5 can add semantic recall without a migration. These operations
are surfaced to the model as tools (``memory_tools``) and to the user in the UI,
satisfying "edit / delete / search memory".
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from .database import Database

if TYPE_CHECKING:
    from .embeddings import EmbeddingProvider

VALID_KINDS = {
    "preference",
    "goal",
    "project",
    "app",
    "routine",
    "instruction",
    "fact",
    "contact",
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class Memory:
    id: int
    kind: str
    key: str | None
    value: str
    importance: int
    source: str | None
    created_at: str
    updated_at: str
    use_count: int

    @classmethod
    def from_row(cls, row) -> "Memory":
        return cls(
            id=row["id"],
            kind=row["kind"],
            key=row["key"],
            value=row["value"],
            importance=row["importance"],
            source=row["source"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            use_count=row["use_count"],
        )

    def render(self) -> str:
        label = f"{self.key}: " if self.key else ""
        return f"[{self.kind}] {label}{self.value}"


class LongTermMemory:
    def __init__(self, db: Database, embedder: "EmbeddingProvider | None" = None) -> None:
        self.db = db
        self.embedder = embedder

    @property
    def semantic(self) -> bool:
        return self.embedder is not None

    # ── create / update ────────────────────────────────────────────────
    def remember(
        self,
        value: str,
        kind: str = "fact",
        key: str | None = None,
        importance: int = 3,
        source: str | None = "conversation",
    ) -> int:
        kind = kind if kind in VALID_KINDS else "fact"
        importance = max(1, min(5, importance))
        now = _now()
        cur = self.db.conn.execute(
            "INSERT INTO memories(kind, key, value, importance, source, created_at, updated_at)"
            " VALUES (?, ?, ?, ?, ?, ?, ?)",
            (kind, key, value, importance, source, now, now),
        )
        self.db.conn.commit()
        mid = int(cur.lastrowid)
        self._embed_and_store(mid, f"{key + ': ' if key else ''}{value}")
        return mid

    def update(self, memory_id: int, value: str) -> bool:
        cur = self.db.conn.execute(
            "UPDATE memories SET value = ?, updated_at = ? WHERE id = ?",
            (value, _now(), memory_id),
        )
        self.db.conn.commit()
        return cur.rowcount > 0

    # ── read ───────────────────────────────────────────────────────────
    def get(self, memory_id: int) -> Memory | None:
        row = self.db.conn.execute(
            "SELECT * FROM memories WHERE id = ?", (memory_id,)
        ).fetchone()
        return Memory.from_row(row) if row else None

    def search(self, query: str, limit: int = 8) -> list[Memory]:
        """Keyword search via FTS5, falling back to LIKE for short queries."""
        q = query.strip()
        if not q:
            return self.recent(limit)
        try:
            rows = self.db.conn.execute(
                "SELECT m.* FROM memories_fts f JOIN memories m ON m.id = f.rowid "
                "WHERE memories_fts MATCH ? ORDER BY rank LIMIT ?",
                (q, limit),
            ).fetchall()
        except Exception:
            rows = self.db.conn.execute(
                "SELECT * FROM memories WHERE value LIKE ? ORDER BY importance DESC LIMIT ?",
                (f"%{q}%", limit),
            ).fetchall()
        self._touch([r["id"] for r in rows])
        return [Memory.from_row(r) for r in rows]

    def recall(self, limit: int = 8) -> list[Memory]:
        """High-signal memories for context injection: important + recently used."""
        rows = self.db.conn.execute(
            "SELECT * FROM memories ORDER BY importance DESC, "
            "COALESCE(last_used_at, updated_at) DESC LIMIT ?",
            (limit,),
        ).fetchall()
        return [Memory.from_row(r) for r in rows]

    def recent(self, limit: int = 8) -> list[Memory]:
        rows = self.db.conn.execute(
            "SELECT * FROM memories ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
        return [Memory.from_row(r) for r in rows]

    def all(self, kind: str | None = None) -> list[Memory]:
        if kind:
            rows = self.db.conn.execute(
                "SELECT * FROM memories WHERE kind = ? ORDER BY id DESC", (kind,)
            ).fetchall()
        else:
            rows = self.db.conn.execute(
                "SELECT * FROM memories ORDER BY id DESC"
            ).fetchall()
        return [Memory.from_row(r) for r in rows]

    # ── delete ─────────────────────────────────────────────────────────
    def forget(self, memory_id: int) -> bool:
        cur = self.db.conn.execute("DELETE FROM memories WHERE id = ?", (memory_id,))
        self.db.conn.commit()
        return cur.rowcount > 0

    # ── semantic recall (Phase 5) ──────────────────────────────────────
    def relevant(self, query: str, limit: int = 8) -> list[Memory]:
        """Most relevant memories for ``query``.

        Uses embeddings when available, else falls back to keyword search.
        This is what the brain injects as context each turn.
        """
        if self.semantic and query.strip():
            sem = self.semantic_search(query, limit)
            if sem:
                return sem
        return self.search(query, limit) if query.strip() else self.recall(limit)

    def semantic_search(self, query: str, limit: int = 8) -> list[Memory]:
        from .embeddings import cosine_topk, from_blob

        rows = self.db.conn.execute(
            "SELECT * FROM memories WHERE embedding IS NOT NULL"
        ).fetchall()
        if not rows:
            return []
        import numpy as np

        matrix = np.vstack([from_blob(r["embedding"]) for r in rows])
        qvec = self.embedder.embed([query])[0]
        ranked = cosine_topk(qvec, matrix, limit)
        results = [Memory.from_row(rows[i]) for i, _score in ranked]
        self._touch([m.id for m in results])
        return results

    def is_duplicate(self, value: str, threshold: float = 0.92) -> bool:
        """Heuristic dedup for auto-extracted facts."""
        if self.semantic:
            hits = self.semantic_search(value, 1)
            if hits:
                from .embeddings import from_blob

                row = self.db.conn.execute(
                    "SELECT embedding FROM memories WHERE id = ?", (hits[0].id,)
                ).fetchone()
                if row and row["embedding"]:
                    import numpy as np

                    a = from_blob(row["embedding"])
                    b = self.embedder.embed([value])[0]
                    if float(np.dot(a, b)) >= threshold:
                        return True
        # Text fallback: exact case-insensitive match.
        norm = value.strip().lower()
        existing = self.db.conn.execute(
            "SELECT 1 FROM memories WHERE lower(value) = ? LIMIT 1", (norm,)
        ).fetchone()
        return existing is not None

    def embed_missing(self) -> int:
        """Backfill embeddings for memories created before semantic mode."""
        if not self.semantic:
            return 0
        rows = self.db.conn.execute(
            "SELECT id, key, value FROM memories WHERE embedding IS NULL"
        ).fetchall()
        for r in rows:
            text = f"{r['key'] + ': ' if r['key'] else ''}{r['value']}"
            self._embed_and_store(r["id"], text)
        return len(rows)

    def _embed_and_store(self, memory_id: int, text: str) -> None:
        if not self.semantic:
            return
        try:
            from .embeddings import to_blob

            vec = self.embedder.embed([text])[0]
            self.db.conn.execute(
                "UPDATE memories SET embedding = ? WHERE id = ?",
                (to_blob(vec), memory_id),
            )
            self.db.conn.commit()
        except Exception:  # embedding must never break a write
            pass

    # ── internal ───────────────────────────────────────────────────────
    def _touch(self, ids: list[int]) -> None:
        if not ids:
            return
        now = _now()
        self.db.conn.executemany(
            "UPDATE memories SET last_used_at = ?, use_count = use_count + 1 WHERE id = ?",
            [(now, i) for i in ids],
        )
        self.db.conn.commit()
