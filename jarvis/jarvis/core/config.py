"""Typed, layered configuration.

Built-in defaults  ◀  config/settings.yaml  ◀  environment (.env for secrets).
Everything is validated by pydantic so a typo fails loudly at startup rather
than deep inside a module. Secrets are read from the environment and never
serialized back to YAML or logs.
"""

from __future__ import annotations

import os
from typing import Literal

import yaml
from pydantic import BaseModel, Field

from .logging import get_logger
from .paths import paths

log = get_logger("core.config")


class AssistantCfg(BaseModel):
    name: str = "JARVIS"
    address_user_as: str = "Sir"
    greeting_style: Literal["classic", "brief", "playful"] = "classic"
    personality: str = "witty"


class WakeCfg(BaseModel):
    enabled: bool = True
    phrase: str = "wake up jarvis"
    sensitivity: float = Field(0.6, ge=0.0, le=1.0)


class StartupCfg(BaseModel):
    sound: bool = True
    play_highway_to_hell: bool = False
    greet: bool = True


class VoiceCfg(BaseModel):
    tts_provider: Literal["elevenlabs", "sapi"] = "elevenlabs"
    stt_provider: Literal["deepgram", "whisper"] = "deepgram"
    voice_id: str = ""
    speed: float = Field(1.0, ge=0.5, le=2.0)
    pitch: float = Field(1.0, ge=0.5, le=2.0)
    interruptible: bool = True


class BrainCfg(BaseModel):
    model: str = "claude-opus-4-8"
    max_tool_steps: int = Field(12, ge=1, le=50)
    temperature: float = Field(0.7, ge=0.0, le=1.0)
    history_turns: int = Field(20, ge=0, le=200)
    max_tokens: int = 2048


class MemoryCfg(BaseModel):
    autoextract: bool = True
    max_recall: int = Field(8, ge=0, le=50)


class PermissionsCfg(BaseModel):
    confirm_destructive: bool = True
    confirm_sensitive: bool = True
    allow_shutdown: bool = True


class UICfg(BaseModel):
    theme: str = "ironman"
    start_minimized: bool = True
    hotkey_toggle: str = "ctrl+alt+j"


class Secrets(BaseModel):
    """Read-only view of secrets sourced from the environment / .env."""

    anthropic_api_key: str = ""
    elevenlabs_api_key: str = ""
    deepgram_api_key: str = ""
    tavily_api_key: str = ""
    spotify_client_id: str = ""
    spotify_client_secret: str = ""
    spotify_redirect_uri: str = "http://localhost:8888/callback"

    @classmethod
    def from_env(cls) -> "Secrets":
        g = os.environ.get
        return cls(
            anthropic_api_key=g("ANTHROPIC_API_KEY", ""),
            elevenlabs_api_key=g("ELEVENLABS_API_KEY", ""),
            deepgram_api_key=g("DEEPGRAM_API_KEY", ""),
            tavily_api_key=g("TAVILY_API_KEY", ""),
            spotify_client_id=g("SPOTIFY_CLIENT_ID", ""),
            spotify_client_secret=g("SPOTIFY_CLIENT_SECRET", ""),
            spotify_redirect_uri=g("SPOTIFY_REDIRECT_URI", "http://localhost:8888/callback"),
        )


class Settings(BaseModel):
    assistant: AssistantCfg = AssistantCfg()
    wake: WakeCfg = WakeCfg()
    startup: StartupCfg = StartupCfg()
    voice: VoiceCfg = VoiceCfg()
    brain: BrainCfg = BrainCfg()
    memory: MemoryCfg = MemoryCfg()
    permissions: PermissionsCfg = PermissionsCfg()
    ui: UICfg = UICfg()
    log_level: str = "INFO"

    # Populated from env, excluded from any YAML round-trip.
    secrets: Secrets = Field(default_factory=Secrets, exclude=True)


def _load_dotenv() -> None:
    """Load .env from the project root if python-dotenv is available."""
    try:
        from dotenv import load_dotenv

        load_dotenv(paths.project_root / ".env")
    except Exception:  # pragma: no cover - dotenv optional
        pass


def load_settings() -> Settings:
    """Build the effective :class:`Settings` from all layers."""
    _load_dotenv()

    raw: dict = {}
    cfg_file = paths.settings_file
    if cfg_file.exists():
        try:
            raw = yaml.safe_load(cfg_file.read_text(encoding="utf-8")) or {}
        except Exception:
            log.exception("Failed to parse %s; using defaults", cfg_file)
    else:
        log.info("No settings.yaml found at %s; using built-in defaults", cfg_file)

    settings = Settings.model_validate(raw)
    settings.secrets = Secrets.from_env()
    return settings
