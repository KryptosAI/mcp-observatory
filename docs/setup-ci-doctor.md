# setup-ci Doctor

`setup-ci --doctor` inspects whether a repository has a usable MCP Observatory CI adoption kit.

```bash
npx @kryptosai/mcp-observatory setup-ci --doctor
```

MCP server packages can also opt into install-time workflow creation by setting `mcpObservatory.autoSetupCi` in `package.json`. See [Automatic CI Integration](./automatic-ci-integration.md).

It checks:

- the GitHub Action workflow exists
- the action is pinned to a release or commit instead of `main`
- the workflow has a command or target config
- deep and security checks are enabled
- write permissions are intentional
- badge, target config, maintainer PR body, issue fallback, and score badge notes exist

Use it after generating a kit:

```bash
npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>" --sarif --schedule weekly
npx @kryptosai/mcp-observatory setup-ci --doctor
```

When a passing `test`, `run`, or single-target `scan` offers CI conversion, the generated kit includes SARIF/Code Scanning upload and weekly scheduled checks by default. Use `--no-ci-sarif` on that source command if a repo wants the lowest-permission workflow first.

Repair or upgrade an existing kit in one step:

```bash
npx @kryptosai/mcp-observatory setup-ci --doctor --fix
```

`--fix` preserves an existing target or command when it can infer one, then rewrites the adoption kit with deep checks, security checks, SARIF upload, maintainer copy, badge snippets, and weekly scheduled runs.

Use it during maintainer PRs to make review easier:

```bash
npx @kryptosai/mcp-observatory setup-ci --doctor --workflow .github/workflows/mcp-observatory.yml
```

The doctor is intentionally advisory. Missing optional assets are warnings. A missing workflow, missing action reference, or missing MCP target is a blocking failure.
