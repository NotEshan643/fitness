"""Pluggable text embeddings for semantic memory recall.

Provider selection (best available wins, all optional):
    1. Voyage AI  — set VOYAGE_API_KEY (Anthropic's recommended embeddings).
    2. sentence-transformers — local/offline, install the ``memory`` extra.
    3. None — semantic recall is simply unavailable and long-term memory falls
       back to FTS keyword search (which already works well).

Vectors are stored in the existing ``memories.embedding`` BLOB column as
float32. SQLite has no vector index, but brute-force cosine over a personal-scale
memory (thousands of rows) is instant.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

import numpy as np

from ..core.config import Settings
from ..core.logging import get_logger

log = get_logger("memory.embeddings")


class EmbeddingProvider(ABC):
    dim: int

    @abstractmethod
    def embed(self, texts: list[str]) -> np.ndarray:
        """Return an (n, dim) float32 array of L2-normalized vectors."""


class VoyageEmbedder(EmbeddingProvider):
    def __init__(self, settings: Settings) -> None:
        import voyageai

        self._client = voyageai.Client(api_key=settings.secrets.voyage_api_key)
        self._model = "voyage-3-lite"
        self.dim = 512

    def embed(self, texts: list[str]) -> np.ndarray:
        resp = self._client.embed(texts, model=self._model, input_type="document")
        return _normalize(np.asarray(resp.embeddings, dtype=np.float32))


class LocalEmbedder(EmbeddingProvider):
    def __init__(self, settings: Settings) -> None:
        from sentence_transformers import SentenceTransformer

        self._model = SentenceTransformer("all-MiniLM-L6-v2")
        self.dim = self._model.get_sentence_embedding_dimension()

    def embed(self, texts: list[str]) -> np.ndarray:
        vecs = self._model.encode(texts, normalize_embeddings=True)
        return np.asarray(vecs, dtype=np.float32)


def make_embedder(settings: Settings) -> EmbeddingProvider | None:
    if settings.secrets.voyage_api_key:
        try:
            emb = VoyageEmbedder(settings)
            log.info("Semantic memory: Voyage AI embeddings")
            return emb
        except Exception as exc:
            log.warning("Voyage embeddings unavailable (%s)", exc)
    try:
        emb = LocalEmbedder(settings)
        log.info("Semantic memory: local sentence-transformers embeddings")
        return emb
    except Exception:
        log.info("Semantic memory disabled; using keyword (FTS) recall")
        return None


# ── vector helpers ─────────────────────────────────────────────────────
def _normalize(mat: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(mat, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return mat / norms


def to_blob(vec: np.ndarray) -> bytes:
    return np.asarray(vec, dtype=np.float32).tobytes()


def from_blob(blob: bytes) -> np.ndarray:
    return np.frombuffer(blob, dtype=np.float32)


def cosine_topk(query: np.ndarray, matrix: np.ndarray, k: int) -> list[tuple[int, float]]:
    """Return (row_index, score) for the top-k rows by cosine similarity.

    Inputs are assumed L2-normalized, so cosine == dot product.
    """
    if matrix.size == 0:
        return []
    scores = matrix @ query
    k = min(k, scores.shape[0])
    idx = np.argpartition(-scores, k - 1)[:k]
    idx = idx[np.argsort(-scores[idx])]
    return [(int(i), float(scores[i])) for i in idx]
