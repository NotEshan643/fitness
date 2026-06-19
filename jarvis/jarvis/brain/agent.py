"""The agent loop: Claude reasoning + native tool-use, permission-gated.

This is where multi-step tasks happen. Claude is given the tool schemas and may
call them; each call is permission-checked, audited, executed, and its result
fed back, until the model produces a final spoken answer (or a step cap is hit).

Confirmation is handled via an injected ``confirm`` callable so the loop is
agnostic to whether approval comes from voice or the HUD.
"""

from __future__ import annotations

from typing import Any, Callable

from ..core.config import Settings
from ..core.events import EventBus
from ..core.logging import get_logger
from ..memory.conversation import ConversationStore
from ..memory.longterm import LongTermMemory
from ..security.audit import AuditLog
from ..security.permissions import ConfirmationRequired, PermissionManager
from ..tools.base import ToolContext
from ..tools.registry import ToolRegistry
from .llm import LLMClient, LLMError
from .persona import build_system_prompt

log = get_logger("brain.agent")

# Default: auto-deny confirmations (safe). The orchestrator injects a real one.
ConfirmFn = Callable[[str], bool]


class Agent:
    def __init__(
        self,
        settings: Settings,
        llm: LLMClient,
        registry: ToolRegistry,
        memory: LongTermMemory,
        conversation: ConversationStore,
        permissions: PermissionManager,
        audit: AuditLog,
        events: EventBus,
        extractor=None,
    ) -> None:
        self.settings = settings
        self.llm = llm
        self.registry = registry
        self.memory = memory
        self.conversation = conversation
        self.permissions = permissions
        self.audit = audit
        self.events = events
        self.extractor = extractor
        # Extra services exposed to tools (e.g. the scheduler), injected by app.
        self.tool_extras: dict = {}

    # ── context assembly ───────────────────────────────────────────────
    def _system_prompt(self, query: str = "") -> str:
        # Inject the memories most relevant to this turn (semantic when enabled).
        mems = self.memory.relevant(query, self.settings.memory.max_recall)
        block = "\n".join(f"- {m.render()}" for m in mems)
        return build_system_prompt(self.settings, block)

    def _history(self) -> list[dict[str, Any]]:
        turns = self.conversation.recent(self.settings.brain.history_turns)
        return [{"role": t["role"], "content": t["content"]} for t in turns]

    # ── main entry ─────────────────────────────────────────────────────
    def respond(self, user_text: str, confirm: ConfirmFn | None = None) -> str:
        """Process one user turn; return JARVIS's spoken reply."""
        confirm = confirm or (lambda _summary: False)
        self.conversation.add("user", user_text)
        self.events.emit("transcript", role="user", text=user_text)

        system = self._system_prompt(user_text)
        messages = self._history()  # already includes the user turn we just added
        ctx = ToolContext(
            settings=self.settings, memory=self.memory, events=self.events,
            extras=self.tool_extras,
        )

        try:
            reply = self._run_loop(system, messages, ctx, confirm)
        except LLMError as exc:
            reply = f"My apologies, {self.settings.assistant.address_user_as} — " \
                    f"I couldn't reach my reasoning core. ({exc})"

        self.conversation.add("assistant", reply)
        self.events.emit("transcript", role="assistant", text=reply)

        # Quietly distill durable facts from this exchange (background).
        if self.extractor is not None:
            self.extractor.maybe_extract(user_text, reply)
        return reply

    def _run_loop(
        self,
        system: str,
        messages: list[dict[str, Any]],
        ctx: ToolContext,
        confirm: ConfirmFn,
    ) -> str:
        for step in range(self.settings.brain.max_tool_steps):
            resp = self.llm.complete(system, messages, self.registry.schemas())

            if resp.stop_reason != "tool_use":
                return _text_of(resp)

            # Echo the assistant's (tool-calling) message back into context.
            messages.append({"role": "assistant", "content": resp.content})
            tool_results = []
            for block in resp.content:
                if getattr(block, "type", None) != "tool_use":
                    continue
                result_text = self._invoke_tool(
                    block.name, dict(block.input or {}), ctx, confirm
                )
                tool_results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result_text,
                    }
                )
            messages.append({"role": "user", "content": tool_results})

        return (
            f"I've reached my step limit on that one, "
            f"{self.settings.assistant.address_user_as}. Shall I keep going?"
        )

    def _invoke_tool(
        self, name: str, args: dict[str, Any], ctx: ToolContext, confirm: ConfirmFn
    ) -> str:
        tool = self.registry.get(name)
        if tool is None:
            return f"Unknown tool: {name}"

        self.events.emit("tool", tool=name, args=args)
        try:
            self.permissions.check(name, tool.risk, tool.summarize(args), confirmed=False)
        except ConfirmationRequired as cr:
            approved = confirm(cr.summary)
            self.audit.record(
                name, args, "confirmed" if approved else "denied"
            )
            if not approved:
                return f"The user declined to {cr.summary}."
            # Re-check with confirmation granted; on success fall through to run.
            try:
                self.permissions.check(name, tool.risk, cr.summary, confirmed=True)
            except PermissionError as pe:
                return str(pe)
        except PermissionError as pe:
            self.audit.record(name, args, "denied", str(pe), level="warning")
            return str(pe)
        else:
            self.audit.record(name, args, "allowed")

        try:
            result = tool.handler(args, ctx)
        except Exception as exc:  # a tool failing must not kill the turn
            log.exception("Tool %s raised", name)
            self.audit.record(name, args, "allowed", f"error: {exc}", level="error")
            return f"That action failed: {exc}"

        self.audit.record(name, args, "allowed", result.text[:500])
        return result.text


def _text_of(resp) -> str:
    """Concatenate the text blocks of a Messages response."""
    parts = [
        getattr(b, "text", "")
        for b in resp.content
        if getattr(b, "type", None) == "text"
    ]
    return "\n".join(p for p in parts if p).strip() or "…"
