# GitHub Actions Artifact Example

This example assumes you already ran `mcp-observatory run` or `mcp-observatory diff` inside CI.

```yaml
- name: Run MCP Observatory
  run: |
    npm run cli -- run --target tests/fixtures/sample-target-config.json

- name: Render Markdown report
  run: |
    npm run cli -- report --run .mcp-observatory/runs/<run-artifact>.json --format markdown --output observatory-report.md

- name: Upload artifacts
  uses: actions/upload-artifact@v4
  with:
    name: mcp-observatory-report
    path: |
      .mcp-observatory/runs/*.json
      observatory-report.md
```

The important pattern is simple:

- persist the machine-friendly JSON
- render the human-friendly Markdown
- upload both
