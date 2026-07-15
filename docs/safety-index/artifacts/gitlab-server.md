# MCP Observatory Run Report

Generated at 2026-07-15T17:55:58.693Z

## Target and Environment Metadata

- Target: `gitlab-server`
- Adapter: `local-process`
- Command: `npx -y @modelcontextprotocol/server-gitlab`
- Server: `gitlab-mcp-server 0.5.1`
- Platform: `darwin 25.5.0`
- Node: `v22.22.1`

## Executive Summary

**Health Score: 75/100 (C)**

| Dimension | Score | Weight |
| --- | --- | --- |
| Protocol Compliance | 60/100 | 30% |
| Schema Quality | 100/100 | 20% |
| Security | 100/100 | 20% |
| Reliability | 33/100 | 20% |
| Performance | 100/100 | 10% |

| Gate | Total | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fail | 7 | 3 | 1 | 1 | 2 | 0 | 0 |

## At a Glance

- Safety verdict: **Blocked** — One or more checks can break agent dependence and should be fixed before production use.
- Top risks: conformance: 5/7 conformance checks passed, 2 failed.; tools: Advertised capability failed during tools/list: [
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      0,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      1,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      2,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      3,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      4,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      5,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      6,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      7,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      8,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  }
]
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: tools
- Partial or flaky checks: conformance
- Skipped checks: none
- Unsupported checks: prompts, resources
- Suggested next step: Start with the failing checks: tools.
- CI next step: `Add CI: npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>"`

## What Was Not Tested

- 🔒 network_egress: No outbound network calls were attempted during scan
- 🔒 filesystem_mutation: Filesystem write operations were not exercised
- ℹ️ credential_access: Credential scanning was performed (see security findings)
- ℹ️ destructive_payloads: Destructive payloads were not attempted (safe-mode only)

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | attack-sim | pass | 0.20 | Safe attack simulation found no high-risk MCP attack-readiness findings. |
| healthy | schema-quality | pass | 0.16 | All 0 item(s) have good schema quality. |
| healthy | security | pass | 0.32 | No security issues detected. |
| review | conformance | partial | 0.67 | 5/7 conformance checks passed, 2 failed. |
| confirm intent | prompts | unsupported | 0.00 | Prompts are not advertised by the target. |
| confirm intent | resources | unsupported | 0.00 | Resources are not advertised by the target. |
| act now | tools | fail | 1.77 | Advertised capability failed during tools/list: [
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      0,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      1,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      2,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      3,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      4,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      5,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      6,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      7,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      8,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  }
] |

## Evidence Snippets

### attack-sim — pass

Summary: Safe attack simulation found no high-risk MCP attack-readiness findings.

- Endpoint: `attack-sim/safe`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: none

### schema-quality — pass

Summary: All 0 item(s) have good schema quality.

- Endpoint: `schema-quality/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: none

### security — pass

Summary: No security issues detected.

- Endpoint: `security/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: none

### conformance — partial

Summary: 5/7 conformance checks passed, 2 failed.

- Endpoint: `conformance/check`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `false`
  - Item count: `7`
  - Identifiers: tools-capability-match, tool-response-content
  - Diagnostics: [pass] capabilities-present: Server returned capabilities object., [pass] server-info: Server provided initialization info., [FAIL] tools-capability-match: Advertised tools but tools/list failed: [
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      0,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      1,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      2,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      3,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      4,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      5,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      6,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      7,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      8,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  }
] (+4 more)

### prompts — unsupported

Summary: Prompts are not advertised by the target.

- Endpoint: `prompts/list`
  - Advertised: `false`
  - Responded: `false`
  - Minimal shape present: `false`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: none

### resources — unsupported

Summary: Resources are not advertised by the target.

- Endpoint: `resources/list | resources/templates/list`
  - Advertised: `false`
  - Responded: `false`
  - Minimal shape present: `false`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: none

### tools — fail

Summary: Advertised capability failed during tools/list: [
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      0,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      1,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      2,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      3,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      4,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      5,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      6,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      7,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      8,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  }
]

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `false`
  - Minimal shape present: `false`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: [
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      0,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      1,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      2,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      3,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      4,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      5,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      6,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      7,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  },
  {
    "code": "invalid_value",
    "values": [
      "object"
    ],
    "path": [
      "tools",
      8,
      "inputSchema",
      "type"
    ],
    "message": "Invalid input: expected \"object\""
  }
], GitLab MCP Server running on stdio

## Reproduction Commands

```bash
npm run cli -- run --target <path-to-target-config.json>
npm run cli -- report --run <path-to-run-artifact.json> --format markdown
```

## Artifact Provenance

- Artifact type: `run`
- Schema version: `1.0.0`
- Run ID: `run_2026-07-15T175558693Z_13935920`
- Gate: `fail`
