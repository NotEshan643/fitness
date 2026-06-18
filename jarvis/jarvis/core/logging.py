"""Structured, human-friendly logging.

Console output is pretty (via :mod:`rich` when available); a rotating file
captures everything for diagnostics. The audit trail of *actions* is separate
(see :mod:`jarvis.security.audit`) — this is operational logging.
"""

from __future__ import annotations

import logging
from logging.handlers import RotatingFileHandler

from .paths import paths

_CONFIGURED = False


def setup_logging(level: str = "INFO") -> None:
    """Idempotently configure root logging for the whole app."""
    global _CONFIGURED
    if _CONFIGURED:
        return

    root = logging.getLogger()
    root.setLevel(getattr(logging, level.upper(), logging.INFO))

    # Console handler — rich if installed, else plain.
    try:
        from rich.logging import RichHandler

        console: logging.Handler = RichHandler(
            rich_tracebacks=True, show_path=False, markup=True
        )
        console.setFormatter(logging.Formatter("%(message)s", datefmt="[%X]"))
    except Exception:  # pragma: no cover - rich optional
        console = logging.StreamHandler()
        console.setFormatter(
            logging.Formatter("%(asctime)s %(levelname)-7s %(name)s | %(message)s")
        )
    root.addHandler(console)

    # Rotating file handler — full detail, 5 files x 2 MB.
    file_handler = RotatingFileHandler(
        paths.logs_dir / "jarvis.log",
        maxBytes=2_000_000,
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setFormatter(
        logging.Formatter(
            "%(asctime)s %(levelname)-7s %(name)s [%(filename)s:%(lineno)d] %(message)s"
        )
    )
    root.addHandler(file_handler)

    _CONFIGURED = True


def get_logger(name: str) -> logging.Logger:
    """Return a namespaced logger, e.g. ``get_logger("brain.agent")``."""
    return logging.getLogger(f"jarvis.{name}")
