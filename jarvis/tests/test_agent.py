"""Agent loop tests with a fake LLM — no network or API key required.

Verifies the core orchestration contract: the loop executes a tool call, feeds
the result back, and returns the model's final text; and that destructive tools
honor the confirmation contract.
"""

from __future__ import annotations

import os
import tempfile
from types import SimpleNamespace

os.environ.setdefault("JARVIS_HOME", tempfile.mkdtemp())

from jarvis.app import JarvisApp  # noqa: E402


def _text_block(text):
    return SimpleNamespace(type="text", text=text)


def _tool_block(name, args, _id="t1"):
    return SimpleNamespace(type="tool_use", name=name, input=args, id=_id)


def _resp(stop_reason, content):
    return SimpleNamespace(stop_reason=stop_reason, content=content)


class FakeLLM:
    """Returns a queued list of responses, one per call."""

    def __init__(self, responses):
        self._responses = list(responses)
        self.calls = []

    def complete(self, system, messages, tools):
        self.calls.append((system, messages, tools))
        return self._responses.pop(0)


def _app():
    app = JarvisApp()
    app.conversation.start()
    return app


def test_agent_runs_tool_then_answers():
    app = _app()
    # First turn: call current_datetime; second turn: final text.
    app.agent.llm = FakeLLM(
        [
            _resp("tool_use", [_tool_block("current_datetime", {})]),
            _resp("end_turn", [_text_block("It is the afternoon, Sir.")]),
        ]
    )
    reply = app.agent.respond("What time is it?")
    assert reply == "It is the afternoon, Sir."
    # Two LLM calls: tool request + final answer.
    assert len(app.agent.llm.calls) == 2
    # The exchange was persisted.
    assert any("time" in m["content"].lower() for m in app.conversation.recent())
    app.shutdown()


def test_destructive_tool_requires_confirmation():
    app = _app()
    mid = app.memory.remember("disposable note")
    app.agent.llm = FakeLLM(
        [
            _resp("tool_use", [_tool_block("forget_memory", {"memory_id": mid})]),
            _resp("end_turn", [_text_block("As you wish, Sir.")]),
        ]
    )
    # Decline confirmation -> memory must survive.
    app.agent.respond("Forget that note", confirm=lambda summary: False)
    assert app.memory.get(mid) is not None

    # Approve confirmation -> memory is deleted.
    app.agent.llm = FakeLLM(
        [
            _resp("tool_use", [_tool_block("forget_memory", {"memory_id": mid})]),
            _resp("end_turn", [_text_block("Done, Sir.")]),
        ]
    )
    app.agent.respond("Forget that note", confirm=lambda summary: True)
    assert app.memory.get(mid) is None
    app.shutdown()


if __name__ == "__main__":
    test_agent_runs_tool_then_answers()
    test_destructive_tool_requires_confirmation()
    print("ALL AGENT TESTS PASSED")
