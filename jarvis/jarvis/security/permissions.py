"""Permission tiers and the confirmation contract.

Every tool declares a :class:`RiskLevel`. The manager turns config + risk level
into a decision: run immediately, or require explicit confirmation, or deny.
Confirmation is a *contract*, not an inline prompt: the manager raises
:class:`ConfirmationRequired`, the orchestrator obtains a yes/no via voice or the
HUD, then re-runs with ``confirmed=True``. This keeps the policy decoupled from
the I/O channel used to confirm.
"""

from __future__ import annotations

from enum import IntEnum

from ..core.config import Settings
from ..core.logging import get_logger

log = get_logger("security.permissions")


class RiskLevel(IntEnum):
    SAFE = 0        # read-only / idempotent (search, read time)
    CONFIRM = 1     # writes / mutations (move/delete files, send email)
    SENSITIVE = 2   # system/power/network/purchases (shutdown, run script)


class ConfirmationRequired(Exception):
    """Raised when a tool needs explicit user approval before running."""

    def __init__(self, tool: str, summary: str) -> None:
        super().__init__(summary)
        self.tool = tool
        self.summary = summary


class PermissionManager:
    def __init__(self, settings: Settings) -> None:
        self.cfg = settings.permissions

    def check(self, tool: str, risk: RiskLevel, summary: str, confirmed: bool) -> None:
        """Authorize a call. Returns on allow; raises on confirm/deny."""
        if risk == RiskLevel.SAFE:
            return

        # Power actions (shutdown/restart/sleep) can be disabled entirely.
        if risk == RiskLevel.SENSITIVE and not self.cfg.allow_shutdown and tool.endswith("_pc"):
            raise PermissionError(f"Power actions are disabled in settings, Sir.")

        needs = (
            (risk == RiskLevel.CONFIRM and self.cfg.confirm_destructive)
            or (risk == RiskLevel.SENSITIVE and self.cfg.confirm_sensitive)
        )
        if needs and not confirmed:
            log.info("Confirmation required for %s", tool)
            raise ConfirmationRequired(tool, summary)
