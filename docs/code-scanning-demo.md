# GitHub Code Scanning Demo

Use this page when a maintainer or agent asks, "What does MCP Observatory actually add to my repo?"

## One-Command Local Demo

```bash
npx @kryptosai/mcp-observatory test npx -y @modelcontextprotocol/server-everything --sarif mcp-observatory.sarif --campaign code-scanning-demo
```

Expected result:

- normal terminal output still appears
- `.mcp-observatory/runs/` receives a run artifact
- `mcp-observatory.sarif` contains normalized MCP findings
- the command exits the same way it would without `--sarif`

## Turn It Into A GitHub Release Gate

```bash
npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y @modelcontextprotocol/server-everything" --sarif --schedule weekly --campaign code-scanning-demo
```

Then verify:

```bash
npx @kryptosai/mcp-observatory setup-ci --doctor
```

The generated workflow requests `security-events: write` when SARIF upload is enabled. Direct `setup-ci` stays conservative unless `--sarif` is passed; automatic CI conversion after a passing `test`, `run`, or single-target `scan` enables SARIF and weekly scheduled checks by default and can be reduced with `--no-ci-sarif`.

## What Code Scanning Gets

MCP Observatory emits one SARIF result per normalized finding. Results include:

- stable rule IDs
- severity mapping
- target/check properties
- lightweight control tags
- partial fingerprints
- artifact locations that point back to the Observatory run evidence

Passing artifacts with no findings still produce valid empty SARIF.

## Maintainer PR Snippet

~~~markdown
This adds a read-only MCP Observatory CI gate for the server.

It checks startup, MCP capability listing, schema quality, and security-oriented findings. The SARIF path is enabled so normalized MCP findings can appear in GitHub Code Scanning.

Verification:

```bash
npx @kryptosai/mcp-observatory setup-ci --doctor
```
~~~
