# MCP Setup

This repository now keeps MCP configuration safe by default:

- `.mcp.json` contains only the shared server definitions
- no API key is stored in the repo
- local overrides can live in `.mcp.local.json`, which is ignored by git

## Context7

`context7` needs `CONTEXT7_API_KEY` available in the environment when Codex starts.

1. Set `CONTEXT7_API_KEY` in your Windows user environment, or launch Codex from a shell where the variable is already defined.
2. Restart Codex after changing the environment.
3. Reload this workspace so the MCP config is picked up again.

## Optional local servers

If you want a machine-specific MCP server, keep it out of the shared `.mcp.json` and put it in `.mcp.local.json` instead.

## Verification

If MCP is loaded correctly, the MCP resource list should stop being empty after Codex reloads this workspace.
