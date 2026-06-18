"""Automatic long-term fact extraction from conversations.

After each exchange, a cheap model pass distills any durable facts the user
revealed (preferences, goals, projects, routines, instructions, contacts) and
stores the novel ones. This is what lets JARVIS "remember previous discussions"
without being explicitly told to. Runs off the response path (background thread)
so it never adds latency, and is gated by ``memory.autoextract``.
"""

from __future__ import annotations

import json
import threading

from ..brain.llm import LLMClient
from ..core.config import Settings
from ..core.logging import get_logger
from .longterm import VALID_KINDS, LongTermMemory

log = get_logger("memory.extractor")

_SYSTEM = """You extract durable, long-term facts about the user from a single \
conversational exchange, for an assistant's memory.

Return ONLY a JSON array (possibly empty). Each item:
  {"kind": one of %s,
   "key": short label or null,
   "value": the fact, written as a standalone statement,
   "importance": 1-5}

Rules:
- Capture only durable facts (preferences, goals, projects, routines, standing
  instructions, contacts, stable personal facts).
- Ignore transient chatter, questions, and anything already obvious.
- Write values in third person ("The user ..."). No commentary, JSON only.
""" % sorted(VALID_KINDS)


class MemoryExtractor:
    def __init__(self, settings: Settings, llm: LLMClient, memory: LongTermMemory) -> None:
        self.settings = settings
        self.llm = llm
        self.memory = memory

    def maybe_extract(self, user_text: str, assistant_text: str) -> None:
        """Fire-and-forget extraction in a background thread."""
        if not self.settings.memory.autoextract:
            return
        threading.Thread(
            target=self._extract, args=(user_text, assistant_text), daemon=True
        ).start()

    def extract_now(self, user_text: str, assistant_text: str) -> int:
        """Synchronous variant (used in tests); returns count stored."""
        return self._extract(user_text, assistant_text)

    def _extract(self, user_text: str, assistant_text: str) -> int:
        exchange = f"User: {user_text}\nAssistant: {assistant_text}"
        try:
            resp = self.llm.complete(
                system=_SYSTEM,
                messages=[{"role": "user", "content": exchange}],
                model=self.settings.brain.extract_model,
            )
        except Exception:
            log.debug("Extraction call failed", exc_info=True)
            return 0

        facts = _parse_facts(resp)
        stored = 0
        for fact in facts:
            value = (fact.get("value") or "").strip()
            if not value or self.memory.is_duplicate(value):
                continue
            self.memory.remember(
                value=value,
                kind=fact.get("kind", "fact"),
                key=fact.get("key") or None,
                importance=int(fact.get("importance", 3)),
                source="auto-extracted",
            )
            stored += 1
        if stored:
            log.info("Auto-stored %d new memory(ies)", stored)
        return stored


def _parse_facts(resp) -> list[dict]:
    text = "".join(
        getattr(b, "text", "") for b in resp.content if getattr(b, "type", None) == "text"
    ).strip()
    # Be lenient: pull the first JSON array out of the response.
    start, end = text.find("["), text.rfind("]")
    if start == -1 or end == -1:
        return []
    try:
        data = json.loads(text[start : end + 1])
        return data if isinstance(data, list) else []
    except json.JSONDecodeError:
        return []
