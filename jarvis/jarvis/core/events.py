"""A tiny synchronous publish/subscribe event bus.

Modules communicate through named events instead of importing each other, which
keeps the dependency graph acyclic. The voice pipeline emits ``wake`` /
``speech``; the UI subscribes to ``state`` / ``transcript``; the orchestrator
ties them together. Handlers run inline and isolated — one failing subscriber
never blocks the rest.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any, Callable

from .logging import get_logger

log = get_logger("core.events")

Handler = Callable[["Event"], None]


@dataclass
class Event:
    name: str
    payload: dict[str, Any] = field(default_factory=dict)


class EventBus:
    """Process-wide, in-memory event hub."""

    def __init__(self) -> None:
        self._subscribers: dict[str, list[Handler]] = defaultdict(list)

    def subscribe(self, name: str, handler: Handler) -> Callable[[], None]:
        """Register ``handler`` for ``name``; returns an unsubscribe callable."""
        self._subscribers[name].append(handler)

        def _off() -> None:
            try:
                self._subscribers[name].remove(handler)
            except ValueError:
                pass

        return _off

    def emit(self, name: str, **payload: Any) -> None:
        event = Event(name=name, payload=payload)
        for handler in list(self._subscribers.get(name, ())):
            try:
                handler(event)
            except Exception:  # one bad subscriber must not break the bus
                log.exception("Event handler for %r failed", name)
