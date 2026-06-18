"""Application orchestrator — wires the modules together and runs JARVIS.

Owns the lifecycle: load config, open memory, build the brain and tools, then
drive interaction. Phase 1 implements a fully working text loop; the voice loop
(Phase 2) and HUD (Phase 7) plug into the same :class:`JarvisApp` services via
the event bus.
"""

from __future__ import annotations

from .brain.agent import Agent
from .brain.llm import LLMClient
from .brain.persona import time_greeting
from .core.config import Settings, load_settings
from .core.events import EventBus
from .core.logging import get_logger, setup_logging
from .integrations.mcp_bridge import MCPBridge
from .memory.conversation import ConversationStore
from .memory.database import Database
from .memory.embeddings import make_embedder
from .memory.extractor import MemoryExtractor
from .memory.longterm import LongTermMemory
from .security.audit import AuditLog
from .security.permissions import PermissionManager
from .tools.registry import build_default_registry

log = get_logger("app")


class JarvisApp:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or load_settings()
        setup_logging(self.settings.log_level)

        # Shared services
        self.events = EventBus()
        self.db = Database()
        self.embedder = make_embedder(self.settings)
        self.memory = LongTermMemory(self.db, embedder=self.embedder)
        self.memory.embed_missing()  # backfill if semantic mode was just enabled
        self.conversation = ConversationStore(self.db)
        self.audit = AuditLog(self.db)
        self.permissions = PermissionManager(self.settings)
        self.registry = build_default_registry()
        # Connect any configured MCP servers (Calendar/Drive/etc.) and register
        # their tools alongside the built-ins.
        self.mcp = MCPBridge(self.settings)
        for tool in self.mcp.start():
            self.registry.add(tool)
        self.llm = LLMClient(self.settings)
        self.extractor = MemoryExtractor(self.settings, self.llm, self.memory)

        self.agent = Agent(
            settings=self.settings,
            llm=self.llm,
            registry=self.registry,
            memory=self.memory,
            conversation=self.conversation,
            permissions=self.permissions,
            audit=self.audit,
            events=self.events,
            extractor=self.extractor,
        )

    @property
    def greeting(self) -> str:
        return time_greeting(self.settings)

    def shutdown(self) -> None:
        self.conversation.end()
        try:
            self.mcp.stop()
        except Exception:
            pass
        self.db.close()

    # ── Text mode (Phase 1) ────────────────────────────────────────────
    def run_text(self) -> None:
        """A terminal conversation loop — fully functional today."""
        addr = self.settings.assistant.address_user_as
        print(f"\n  {self.settings.assistant.name} online. {self.greeting}")
        print(f"  (type 'exit' to power down)\n")
        self.conversation.start()

        def confirm(summary: str) -> bool:
            ans = input(f"  ⚠  Confirm: {summary}? [y/N] ").strip().lower()
            return ans in {"y", "yes"}

        try:
            while True:
                try:
                    user = input(f"  {addr} › ").strip()
                except (EOFError, KeyboardInterrupt):
                    break
                if not user:
                    continue
                if user.lower() in {"exit", "quit", "shutdown", "goodbye"}:
                    print(f"\n  Powering down. Goodbye, {addr}.\n")
                    break
                reply = self.agent.respond(user, confirm=confirm)
                print(f"\n  {self.settings.assistant.name}: {reply}\n")
        finally:
            self.shutdown()

    # ── Voice mode (Phase 2) ───────────────────────────────────────────
    def run_voice(self) -> None:
        try:
            from .voice.pipeline import VoicePipeline
        except Exception as exc:
            log.warning("Voice stack unavailable: %s", exc)
            print(
                "\n  Voice mode arrives in Phase 2 (and needs the voice extras "
                "installed).\n  Running text mode for now.\n"
            )
            self.run_text()
            return
        VoicePipeline(self).run()
