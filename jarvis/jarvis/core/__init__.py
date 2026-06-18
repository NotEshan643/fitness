"""Core services: configuration, logging, paths and the event bus.

These have no dependencies on other JARVIS modules and are injected everywhere
else, so import direction always points *into* core.
"""

from .config import Settings, load_settings
from .events import Event, EventBus
from .logging import get_logger, setup_logging
from .paths import AppPaths, paths

__all__ = [
    "Settings",
    "load_settings",
    "Event",
    "EventBus",
    "get_logger",
    "setup_logging",
    "AppPaths",
    "paths",
]
