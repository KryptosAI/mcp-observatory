# MCP Observatory Run Report

Generated at 2026-07-15T22:35:00.079Z

## Target and Environment Metadata

- Target: `spotify-mcp`
- Adapter: `local-process`
- Command: `npx -y spotify-mcp`
- Server: `spotify-mcp 1.0.0`
- Platform: `darwin 25.5.0`
- Node: `v22.22.1`

## Executive Summary

**Health Score: 92/100 (A)**

| Dimension | Score | Weight |
| --- | --- | --- |
| Protocol Compliance | 100/100 | 30% |
| Schema Quality | 60/100 | 20% |
| Security | 100/100 | 20% |
| Reliability | 100/100 | 20% |
| Performance | 100/100 | 10% |

| Gate | Total | Pass | Fail | Partial | Unsupported | Flaky | Skipped |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pass | 9 | 7 | 0 | 2 | 0 | 0 | 0 |

## At a Glance

- Safety verdict: **Needs review** — The server is usable, but caveated checks should be reviewed before agents depend on it.
- Top risks: runtime-profile: Detected 1 potential egress target(s) and 23 potential state mutation(s) with high confidence.; schema-quality: Found 54 quality finding(s) across 59 item(s): 0 warnings, 54 info.
- Regression/schema drift: Run `mcp-observatory diff <previous-run.json> <current-run.json>` to classify regressions and schema drift.
- Failing checks: none
- Partial or flaky checks: runtime-profile, schema-quality
- Skipped checks: none
- Unsupported checks: none
- Suggested next step: Review the caveated checks next: runtime-profile, schema-quality.
- CI next step: `Add CI: npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>"`

## What Was Not Tested

- 🔒 network_egress: No outbound network calls were attempted during scan
- ℹ️ credential_access: Credential scanning was performed (see security findings)
- ℹ️ destructive_payloads: Destructive payloads were not attempted (safe-mode only)

## Runtime Profile

### Egress Manifest

The following targets were identified as potentially reachable by this server (confidence: **high**):

| Target | Protocol | Source | Confidence |
| --- | --- | --- | --- |
| uri | unknown | tool_schema | high |

### State Mutations

The following state-modifying operations were identified from tool schemas:

| Resource | Operation | Scope | Source |
| --- | --- | --- | --- |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |
| filesystem | write | working_directory | description_analysis |

_Analyzed at 2026-07-15T22:35:00.872Z_

## Regressions and Recoveries

_Use the `diff` command against another run artifact to classify regressions and recoveries over time._

## Full Capability Status Table

| Focus | Check | Status | Duration (ms) | Message |
| --- | --- | --- | --- | --- |
| healthy | attack-sim | pass | 1.58 | Safe attack simulation found no high-risk MCP attack-readiness findings. |
| healthy | conformance | pass | 3.50 | All 7 conformance checks passed. |
| healthy | prompts | pass | 0.41 | Advertised capability responded with the minimal expected shape (4 items). |
| healthy | resources | pass | 0.40 | Advertised capability responded with the minimal expected shape (8 items). |
| healthy | security | pass | 0.90 | No security issues detected. |
| healthy | security-lite | pass | 0.08 | No security issues detected (lightweight scan). |
| healthy | tools | pass | 3.72 | Advertised capability responded with the minimal expected shape (47 items). |
| review | runtime-profile | partial | 0.26 | Detected 1 potential egress target(s) and 23 potential state mutation(s) with high confidence. |
| review | schema-quality | partial | 1.17 | Found 54 quality finding(s) across 59 item(s): 0 warnings, 54 info. |

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

### conformance — pass

Summary: All 7 conformance checks passed.

- Endpoint: `conformance/check`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `7`
  - Identifiers: none
  - Diagnostics: [pass] capabilities-present: Server returned capabilities object., [pass] server-info: Server provided initialization info., [pass] tools-capability-match: tools/list returned 47 tool(s). (+4 more)

### prompts — pass

Summary: Advertised capability responded with the minimal expected shape (4 items).

- Endpoint: `prompts/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `4`
  - Identifiers: dj, playlist_from_mood, music_taste_summary, discover_weekly_alternative
  - Diagnostics: none

### resources — pass

Summary: Advertised capability responded with the minimal expected shape (8 items).

- Endpoint: `resources/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `8`
  - Identifiers: spotify://me, spotify://player/state, spotify://player/queue, spotify://me/top/tracks, spotify://me/top/artists (+3 more)
  - Diagnostics: none
- Endpoint: `resources/templates/list`
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

### security-lite — pass

Summary: No security issues detected (lightweight scan).

- Endpoint: `security/scan-lite`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `0`
  - Identifiers: none
  - Diagnostics: none

### tools — pass

Summary: Advertised capability responded with the minimal expected shape (47 items).

- Endpoint: `tools/list`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `47`
  - Identifiers: get_now_playing, play, pause, skip_next, skip_previous (+42 more)
  - Diagnostics: none

### runtime-profile — partial

Summary: Detected 1 potential egress target(s) and 23 potential state mutation(s) with high confidence.

- Endpoint: `runtime-profile/analyze`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `24`
  - Identifiers: none
  - Diagnostics: Egress entries: 1, State mutations: 23, Confidence: high

### schema-quality — partial

Summary: Found 54 quality finding(s) across 59 item(s): 0 warnings, 54 info.

- Endpoint: `schema-quality/scan`
  - Advertised: `true`
  - Responded: `true`
  - Minimal shape present: `true`
  - Item count: `54`
  - Identifiers: play, pause, skip_next, skip_previous, get_top_tracks (+10 more)
  - Diagnostics: [info] tool "play": Has properties but no 'required' array declared, [info] tool "pause": Has properties but no 'required' array declared, [info] tool "skip_next": Has properties but no 'required' array declared (+51 more)

## Reproduction Commands

```bash
npm run cli -- run --target <path-to-target-config.json>
npm run cli -- report --run <path-to-run-artifact.json> --format markdown
```

## Artifact Provenance

- Artifact type: `run`
- Schema version: `1.0.0`
- Run ID: `run_2026-07-15T223500079Z_79332f60`
- Gate: `pass`
