"""Phase 6 tests: Spotify tool registration/degradation and MCP bridge safety."""

from __future__ import annotations

import os
import tempfile

os.environ.setdefault("JARVIS_HOME", tempfile.mkdtemp())

from jarvis.app import JarvisApp  # noqa: E402
from jarvis.core.config import MCPServerCfg, load_settings  # noqa: E402
from jarvis.integrations.mcp_bridge import MCPBridge, mcp_risk_for  # noqa: E402
from jarvis.security.permissions import RiskLevel  # noqa: E402
from jarvis.tools.base import ToolContext  # noqa: E402

_SPOTIFY_TOOLS = [
    "spotify_play", "spotify_pause", "spotify_resume", "spotify_next",
    "spotify_previous", "spotify_volume", "spotify_now_playing",
]


def test_spotify_tools_registered_and_degrade_without_keys():
    app = JarvisApp()
    for name in _SPOTIFY_TOOLS:
        assert app.registry.get(name) is not None
    app.settings.secrets.spotify_client_id = ""
    app.settings.secrets.spotify_client_secret = ""
    # Reset cached controller so it picks up the cleared creds.
    import jarvis.tools.spotify as sp

    sp._controller = None
    ctx = ToolContext(settings=app.settings, memory=app.memory, events=app.events)
    r = app.registry.dispatch("spotify_pause", {}, ctx)
    assert not r.ok and "isn't set up" in r.text
    app.shutdown()


def test_mcp_risk_heuristic():
    assert mcp_risk_for("list_events") == RiskLevel.SAFE
    assert mcp_risk_for("search_files") == RiskLevel.SAFE
    assert mcp_risk_for("create_event") == RiskLevel.CONFIRM
    assert mcp_risk_for("delete_file") == RiskLevel.CONFIRM
    assert mcp_risk_for("send_email") == RiskLevel.CONFIRM


def test_mcp_bridge_noop_without_servers():
    settings = load_settings()
    settings.integrations.mcp_servers = []
    assert MCPBridge(settings).start() == []


def test_mcp_bridge_handles_missing_package_gracefully():
    # Even with a server configured, a missing 'mcp' package must not raise.
    settings = load_settings()
    settings.integrations.mcp_servers = [MCPServerCfg(name="x", command="false")]
    bridge = MCPBridge(settings)
    try:
        import mcp  # noqa: F401

        return  # package present here; the no-server test covers the rest
    except Exception:
        assert bridge.start() == []


if __name__ == "__main__":
    test_spotify_tools_registered_and_degrade_without_keys()
    test_mcp_risk_heuristic()
    test_mcp_bridge_noop_without_servers()
    test_mcp_bridge_handles_missing_package_gracefully()
    print("ALL INTEGRATION TESTS PASSED")
