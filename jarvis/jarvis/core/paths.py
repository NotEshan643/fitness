"""Resolve on-disk locations for config, data and logs.

All user state lives under a single app-data directory so JARVIS is easy to back
up and never scatters files. On Windows this is ``%APPDATA%/JARVIS``; on other
platforms we fall back to ``~/.jarvis`` so the project remains developable on
Linux/macOS.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def _app_data_root() -> Path:
    if os.name == "nt":
        base = os.environ.get("APPDATA") or str(Path.home() / "AppData" / "Roaming")
        return Path(base) / "JARVIS"
    # Allow overriding in dev / tests.
    override = os.environ.get("JARVIS_HOME")
    if override:
        return Path(override)
    return Path.home() / ".jarvis"


@dataclass(frozen=True)
class AppPaths:
    """Canonical filesystem locations, created on first access."""

    root: Path
    project_root: Path

    @property
    def config_dir(self) -> Path:
        return self.project_root / "config"

    @property
    def data_dir(self) -> Path:
        return self._ensure(self.root / "data")

    @property
    def logs_dir(self) -> Path:
        return self._ensure(self.root / "logs")

    @property
    def db_path(self) -> Path:
        return self.data_dir / "jarvis.db"

    @property
    def settings_file(self) -> Path:
        return self.config_dir / "settings.yaml"

    @property
    def settings_example(self) -> Path:
        return self.config_dir / "settings.example.yaml"

    @staticmethod
    def _ensure(path: Path) -> Path:
        path.mkdir(parents=True, exist_ok=True)
        return path


# project_root = the `jarvis/` project folder (two levels up from this file:
# jarvis/jarvis/core/paths.py -> jarvis/)
_PROJECT_ROOT = Path(__file__).resolve().parents[2]

paths = AppPaths(root=_app_data_root(), project_root=_PROJECT_ROOT)
"""Process-wide singleton. Import this rather than re-deriving paths."""
