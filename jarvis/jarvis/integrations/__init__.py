"""External integrations exposed to the agent as tools.

Currently: a generic Model Context Protocol (MCP) bridge, so any MCP server —
Google Calendar, Google Drive, and others — can be connected via config and have
its tools auto-registered, rather than hardcoding one vendor's API.
"""

from .mcp_bridge import MCPBridge, mcp_risk_for

__all__ = ["MCPBridge", "mcp_risk_for"]
