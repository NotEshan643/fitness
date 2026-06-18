"""Phase 5 tests: semantic recall and automatic fact extraction.

A deterministic bag-of-words embedder stands in for the real provider so we can
test ranking without network/models. A fake LLM exercises the extractor.
"""

from __future__ import annotations

import os
import tempfile
from types import SimpleNamespace

os.environ.setdefault("JARVIS_HOME", tempfile.mkdtemp())

import numpy as np  # noqa: E402

from jarvis.memory.database import Database  # noqa: E402
from jarvis.memory.embeddings import EmbeddingProvider  # noqa: E402
from jarvis.memory.longterm import LongTermMemory  # noqa: E402


class BowEmbedder(EmbeddingProvider):
    """Hashing bag-of-words → normalized vector. Deterministic, dependency-free."""

    dim = 64

    def embed(self, texts):
        out = np.zeros((len(texts), self.dim), dtype=np.float32)
        for i, t in enumerate(texts):
            for word in t.lower().split():
                out[i, hash(word) % self.dim] += 1.0
        norms = np.linalg.norm(out, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        return out / norms


def _mem():
    db = Database(db_path=tempfile.mktemp(suffix=".db"))
    return LongTermMemory(db, embedder=BowEmbedder())


def test_semantic_recall_ranks_by_meaning():
    m = _mem()
    m.remember("The user is training for a marathon in October", kind="goal")
    m.remember("The user prefers dark roast coffee", kind="preference")
    m.remember("The user runs every morning before work", kind="routine")

    top = m.relevant("running and marathon training", limit=2)
    joined = " ".join(x.value for x in top).lower()
    assert "marathon" in joined or "runs every morning" in joined
    # The coffee preference should not be the top hit for a running query.
    assert top[0].kind != "preference"


def test_is_duplicate_blocks_near_identical():
    m = _mem()
    m.remember("The user is building an e-commerce business", kind="project")
    assert m.is_duplicate("The user is building an e-commerce business")
    assert not m.is_duplicate("The user enjoys hiking on weekends")


def test_extractor_stores_and_dedupes():
    from jarvis.core.config import load_settings
    from jarvis.memory.extractor import MemoryExtractor

    settings = load_settings()
    m = _mem()

    class FakeLLM:
        def complete(self, system, messages, tools=None, model=None):
            payload = (
                '[{"kind":"goal","key":"fitness",'
                '"value":"The user wants to run a marathon","importance":5}]'
            )
            return SimpleNamespace(content=[SimpleNamespace(type="text", text=payload)])

    ex = MemoryExtractor(settings, FakeLLM(), m)
    assert ex.extract_now("I want to run a marathon", "Noted, Sir.") == 1
    # Second identical extraction is deduped.
    assert ex.extract_now("I want to run a marathon", "Noted, Sir.") == 0
    assert any("marathon" in x.value for x in m.all())


if __name__ == "__main__":
    test_semantic_recall_ranks_by_meaning()
    test_is_duplicate_blocks_near_identical()
    test_extractor_stores_and_dedupes()
    print("ALL MEMORY TESTS PASSED")
