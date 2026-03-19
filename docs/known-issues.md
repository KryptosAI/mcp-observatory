# Known Issues

## Not every MCP package is a drop-in stdio target

Some packages in the ecosystem are app-oriented, require additional startup flags, or close immediately when invoked like a plain local-process stdio server. That is not a failure of MCP Observatory; it is useful ecosystem signal.

Observed examples during launch hardening:

- `@modelcontextprotocol/server-map` timed out under the current local-process harness
- `@modelcontextprotocol/server-threejs` closed the connection before initialization completed
- `@jsonresume/mcp` closed the connection before initialization completed
- `@modelcontextprotocol/server-pdf` timed out under the current probe setup

These are good candidates for future integration work because they help clarify:

- stdio vs app/server transport expectations
- startup requirements for package-specific servers
- how MCP Observatory should present connection/setup failures clearly
