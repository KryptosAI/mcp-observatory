# Automatic CI Integration

MCP Observatory includes an install-time CI helper for MCP server projects.

By default, the helper is safe and non-mutating: when it detects a likely MCP project, it prints the exact `setup-ci` command to add GitHub Actions. It does not create files unless the project explicitly opts in.

To let installs create the workflow automatically, add this to the MCP server project's `package.json`:

```json
{
  "mcpObservatory": {
    "autoSetupCi": true,
    "command": "npm run mcp",
    "sarif": true
  }
}
```

Then installing MCP Observatory creates `.github/workflows/mcp-observatory.yml` if it does not already exist:

```bash
npm install -D @kryptosai/mcp-observatory
npx @kryptosai/mcp-observatory setup-ci --doctor
```

Environment controls:

- `MCP_OBSERVATORY_AUTO_SETUP_CI=1` creates CI during install for detected MCP projects.
- `MCP_OBSERVATORY_TARGET_COMMAND="npm run mcp"` provides the startup command.
- `MCP_OBSERVATORY_AUTO_SETUP_SARIF=1` enables SARIF upload in the generated workflow.
- `MCP_OBSERVATORY_POSTINSTALL=0` or `MCP_OBSERVATORY_DISABLE_POSTINSTALL=1` disables the helper.

The helper skips CI environments and skips MCP Observatory's own repository. Existing workflows are never overwritten.
