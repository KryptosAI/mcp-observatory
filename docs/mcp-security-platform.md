# MCP Security Platform: Scan Before You Trust, Enforce at Runtime

## The MCP Security Gap

The Model Context Protocol ecosystem has exploded. With over 47,000 repositories on GitHub and more than 65 security-focused tools available, MCP has become the primary interface between AI agents and the systems they control.

Yet a critical gap remains: **no single tool does both pre-install scanning AND runtime enforcement.**

- **Scanners** tell you a server looks risky — but they don't stop a single call.
- **Proxies** block traffic at runtime — but they don't tell you what to block until it's too late.
- **Gateways and firewalls** apply network-level rules — but they don't understand MCP semantics, tool arguments, or agent intent.

Enterprises deploying AI agents in production need both:

1. **Verify** MCP servers for vulnerabilities, exposed secrets, supply-chain risks, and dangerous capabilities *before* connecting them.
2. **Enforce** security policies on every tool call at runtime — allow, deny, warn, or redact — without modifying the agent or the server.

Today, the status quo is manual security review, ad-hoc nginx proxies, or nothing at all. That changes now.

---

## Our Two-Tool Platform

**mcp-observatory** scans before you trust. **mcp-seatbelt** enforces at runtime. Together, they form the only end-to-end MCP security platform.

```
PRE-INSTALL (observatory)          RUNTIME (seatbelt)
─────────────────────────          ──────────────────
npx observatory scan               npx seatbelt proxy
         │                                  │
         ▼                                  ▼
  ┌──────────────┐                 ┌──────────────┐
  │ Discover     │                 │ Intercept    │
  │ Assess Risk  │                 │ Evaluate     │
  │ Score (0-100)│                 │ Allow/Deny   │
  │ Attack Sim   │                 │ Redact Args  │
  │ SARIF Report │                 │ Audit Log    │
  └──────┬───────┘                 └──────┬───────┘
         │                                │
         ▼                                ▼
  observatory JSON artifact ───►  seatbelt policy rules
         │                                │
         ▼                                ▼
  Safety Index (public)            Dashboard (live)
```

### mcp-observatory — Pre-Install Scanner

- **Discover** MCP servers from npm registries, GitHub, Smithery, PulseMCP, and MCP Market
- **Score** every server on a 0–100 safety index across 13 risk dimensions
- **Attack simulation** tests servers against prompt injection, tool poisoning, path traversal, command injection, and resource exfiltration
- **CVE mapping** cross-references server dependencies against known vulnerability databases
- **SARIF 2.1.0 export** for CI/CD integration with GitHub Code Scanning, GitLab SAST, and DefectDojo
- **Telemetry dashboard** showing ecosystem-wide safety trends — no personal data, no tracking

### mcp-seatbelt — Runtime Enforcement Proxy

- **Detect** MCP server configurations across 8 clients: Cursor, Claude Desktop, VS Code, Windsurf, ChatGPT Desktop, JetBrains, Codex, and project-local configs
- **Transparent proxy** sits between your agent and MCP servers on port 9420 — no agent changes needed
- **Policy engine** evaluates every JSON-RPC 2.0 call against 7 built-in policy rules: shell execution, sensitive paths, credential access, credential redaction, private network, process execution, and time-windowed filesystem writes
- **Dual mode**: `audit` logs violations; `enforce` blocks denied calls
- **Live dashboard** at `localhost:9421` for real-time visibility into every tool call
- **CI/CD ready** with `mcp-seatbelt check` returning non-zero on critical risk detection

---

## Comparison: Us vs The Market

| Tool | Pre-install Scan | Runtime Enforcement | Attack Simulation | Health Score | Argument Redaction | Learning Mode | Live Dashboard | Open Source |
|---|---|---|---|---|---|---|---|---|
| **mcp-observatory + mcp-seatbelt** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Snyk agent-scan | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Cisco mcp-scanner | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| IBM ContextForge | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| mcp-firewall | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| mcp-guardian | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Prismor | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| agent-shield | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Tencent AI-Infra-Guard | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

**No competitor checks both the "Pre-install Scan" and "Runtime Enforcement" columns.** Tools either scan and report, or proxy and block — never both. Our platform is the only solution that covers the full lifecycle: discover risk before connection, block danger at call time.

---

## How They Integrate

### Direct Artifact Import

```bash
mcp-seatbelt import-observatory <artifact.json>
```

Observatory scan results convert directly into seatbelt policy rules. High and critical findings become `deny` rules. Medium findings become `warn` rules. The mapping is intelligent:

- Observatory tool findings → seatbelt `command` target rules
- Observatory path findings → seatbelt `file` target rules
- Observatory network/host findings → seatbelt `network` target rules
- Observatory env/credential findings → seatbelt `env` target rules

Seatbelt automatically discovers observatory artifacts in `.mcp-observatory/runs/` and `.mcp-observatory-metrics/` directories. Run `import-observatory` with no arguments and it finds the latest scan results automatically.

### Safety Index to Allowlist

Observatory's 0–100 safety index pre-populates seatbelt allowlists. Servers scoring above 80 can be automatically allowlisted. Servers below 40 get strict-deny rules. Everything in between gets a warning.

### Combined Telemetry & Metrics

Observatory telemetry shows **what the ecosystem looks like** — which servers are risky, where vulnerabilities cluster, what attack surfaces dominate. Seatbelt telemetry shows **what your agents are doing** — which tools get called, what gets blocked, what gets redacted. Together they give you:

- **Observatory metrics dashboard** (private): pre-install health scores across your MCP portfolio, CVE exposure trends, supply-chain risk distribution
- **Seatbelt dashboard** (live at `:9421`): real-time tool call stream, block/allow/warn ratios, per-client and per-server enforcement stats

### Unified CI/CD Pipeline

```
CI Pipeline:
  1. npx observatory scan      → SARIF report uploaded to code scanning
  2. npx observatory score     → safety index gates deployment
  3. npx seatbelt check        → critical risk detection fails the build
  4. npx seatbelt proxy        → runtime enforcement in staging/production
```

---

## Quick Start

```bash
# Step 1: Scan before you trust
npx @kryptosai/mcp-observatory scan
npx @kryptosai/mcp-observatory score npx -y my-mcp-server

# Step 2: Import findings into seatbelt
npx mcp-seatbelt init
npx mcp-seatbelt import-observatory .mcp-observatory/runs/latest.json

# Step 3: Enforce at runtime
npx mcp-seatbelt proxy --policy enforce
npx mcp-seatbelt dashboard
```

That's it. Three commands, one platform, full coverage.

---

## Enterprise Story

### Observatory Cloud — Hosted History and Release Evidence

Security teams don't want to run scanners on developer laptops. Observatory Cloud provides:

- One free hosted snapshot before checkout
- Individual Pro history, CI ingestion, regression markers, and artifact downloads for one developer
- Evidence exports that can support a customer's own review process without claiming certification or compliance
- A fixed `$15,000`, 1-3-server, ten-business-day Release Gate Pilot for owner-ready production decisions

### Seatbelt Proxy — On-Premises Runtime Enforcement

Runtime enforcement stays where your data lives. Seatbelt runs on-premises, in your VPC, behind your firewall:

- No telemetry sent anywhere — all enforcement data stays local
- Policy-as-code in YAML, version-controlled alongside your infrastructure
- LDAP/OIDC integration for per-team, per-role policy assignment (roadmap)
- Prometheus metrics endpoint for integration with existing monitoring stacks (roadmap)

### Full Lifecycle MCP Security

```
DEVELOP          →    CI/CD          →    STAGING         →    PRODUCTION
─────────────         ──────────          ───────────         ────────────
observatory scan      observatory score   seatbelt audit       seatbelt enforce
  ↓                     ↓                   ↓                    ↓
Risk report           SARIF upload        Policy test          Live dashboard
Safety index          Build gate          Dry-run blocks       Active blocking
Attack simulation     PR comment          Import findings      Audit logging
```

**Scan in CI/CD. Enforce in production.** No gaps. No blind spots. No manual review bottleneck.

### Contact

For enterprise licensing, hosted observatory, or custom integrations:
**william@banksey.com**

---

## What Makes This Unique

- **Only MCP security platform** that covers pre-install scanning AND runtime enforcement — everybody else does one or the other
- **20 total security checks** — 13 risk rules in observatory plus 7 policy rules in seatbelt
- **686 tests** across both tools (212 in observatory + 474 in seatbelt) ensuring reliability at every layer
- **8 client detectors** — auto-discovers MCP configs in Cursor, Claude Desktop, VS Code, Windsurf, ChatGPT Desktop, JetBrains, Codex, and project-local configs
- **9 check modules** covering shell interpreters, docker sandboxing, network tools, process spawning, destructive filesystem ops, remote access, sensitive environment variables, package runner risks, and privilege escalation
- **30 CLI commands** across both tools (22 in observatory + 8 in seatbelt) covering every security workflow
- **Open source (MIT)**, npm-native, zero external dependencies beyond what you already trust
- **CI/CD ready** with SARIF export, non-zero exit codes on failure, and GitHub Actions workflow templates
- **Already listed** in the awesome-mcp-servers Security section — the ecosystem's canonical reference
- **Argument redaction** — not just block/allow, but transparently redact credentials from tool calls before they reach the server
- **Learning mode** — run in audit mode to observe real-world usage patterns before enforcing strict policies
- **Time-windowed rules** — allow filesystem writes only during business hours, or block network access on weekends

---

**Scan before you trust. Enforce at runtime. That's the full picture.**
