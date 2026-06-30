# setup-ci Doctor

`setup-ci --doctor` inspects whether a repository has a usable MCP Observatory CI adoption kit.

```bash
npx @kryptosai/mcp-observatory setup-ci --doctor
```

It checks:

- the GitHub Action workflow exists
- the action is pinned to a release or commit instead of `main`
- the workflow has a command or target config
- deep and security checks are enabled
- write permissions are intentional
- badge, target config, maintainer PR body, issue fallback, and score badge notes exist

Use it after generating a kit:

```bash
npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>"
npx @kryptosai/mcp-observatory setup-ci --doctor
```

Use it during maintainer PRs to make review easier:

```bash
npx @kryptosai/mcp-observatory setup-ci --doctor --workflow .github/workflows/mcp-observatory.yml
```

The doctor is intentionally advisory. Missing optional assets are warnings. A missing workflow, missing action reference, or missing MCP target is a blocking failure.
