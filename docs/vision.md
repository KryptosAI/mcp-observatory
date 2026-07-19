# MCP Observatory — Development Vision

This document describes the ideal end-state for MCP Observatory. It exists to guide
development decisions — when we're choosing between features, we build toward this.

---

## Where We're Going

Every AI agent relies on MCP servers. Those servers are production dependencies with
no trust infrastructure — no standard for evaluation, no chain of evidence, no way to
answer "can I trust this tool?" in an automated pipeline.

MCP Observatory exists to become that standard. The scanner that evaluates every MCP
server. The evidence engine that makes trust verifiable. The dashboard that gives teams
visibility into their agent toolchain. The agent that monitors other agents.

The outcome: before an agent invokes a tool, someone has verified it works, security
has reviewed its boundaries, and the evidence is machine-readable.

---

## The Ideal System

### 1. Universal Evaluation

Every MCP server — public or private — has a live safety score. A single command
produces a grade, a report, and a chain of evidence. The score is reproducible:
anyone can run the same scan against the same server and get the same result.

`mcp-observatory scan` discovers every server in your config. `mcp-observatory demo`
gets a new user to their first safety grade in under 10 seconds. The Safety Index
covers every popular server, and the API lets any tool query it.

### 2. Cryptographic Trust Chain

A scan result is evidence. A signed receipt is trust. The chain: scanner produces
evidence → evidence is signed (Ed25519) by the evaluator → CI pipeline counter-signs
→ deployer verifies the chain before accepting the server as a dependency.

Trust becomes transitive and machine-auditable. A procurement team doesn't ask "is
this server safe?" — they ask "show me the receipt chain." The answer is a
verifiable artifact, not a claim.

### 3. Fleet-Scale Observability

Individual scans become team-wide visibility. A dashboard answers:

- Which servers are healthy? Which are drifting?
- Where are the security boundaries across our fleet?
- Which servers have CI gating? Which don't?
- What changed between last week's scan and this week's?

The dashboard is the decision record — for procurement, for compliance, for incident
response. It's what a CISO sees before approving an MCP deployment.

### 4. Compliance as Code

Compliance frameworks (SOC 2, NIST AI RMF, EU AI Act) become profiles, not documents.
`mcp-observatory audit --profile soc2` maps findings to controls. The scanner becomes
the auditor; the report becomes the audit trail.

An enterprise team running 50 MCP servers doesn't write a compliance document — they
run a scan and get a compliance report. Evidence is attached to controls
automatically. The audit is reproducible.

### 5. Agent-Native Security

The scanner itself is an MCP server. Your AI agent runs `mcp-observatory serve` and
gains the ability to scan, test, and verify other MCP servers autonomously. An agent
can monitor its own tools — checking health, catching drift, flagging new security
findings — without human gatekeeping.

The vision: your CI agent catches a regression before you wake up. Your security
agent flags a new finding in a dependency. Your compliance agent produces the
quarterly report. All from the same tool.

---

## What We Don't Build

Explicit scope boundaries keep the project focused:

- **Not a registry** — npm and GitHub already exist. We evaluate servers; we don't
  host or distribute them.
- **Not a runtime proxy** — mcp-seatbelt handles runtime enforcement. Observatory
  produces evidence; seatbelt enforces policy at the wire.
- **Not a compliance auditor** — We produce structured evidence mapped to controls. A
  human (or a future compliance agent) decides whether the evidence satisfies the
  auditor.
- **Not a CI platform** — We generate CI configs and SARIF reports. We don't run the
  CI pipeline or store artifacts long-term (that's the hosted tier).

---

## Development Roadmap

### v1 — Individual Trust (now)

A developer can answer "is this MCP server safe to use?" in one command. The answer
is a score, a grade, check results, and an evidence artifact.

Done: `test`, `scan`, `score`, `diff`, `audit`, `receipt`, `badge`, attack
simulation, record/replay/verify, lock files, CI setup, demo command, Safety Index
(175 servers), Ed25519 receipts, multi-CI templates, SSO auth.

### v2 — Fleet Trust (next 3 months)

A team can answer "are our MCP servers healthy?" across their entire fleet. The
answer is a dashboard with trends, drift alerts, and compliance evidence.

To build: hosted fleet dashboard, compliance profiles (SOC 2, NIST, EU AI Act),
public Safety Index API, team/org scoping, slack/webhook alerts, schedule management.

### v3 — Ecosystem Trust (2027)

The ecosystem can answer "can I trust any MCP server?" without manual evaluation. The
answer is a trust registry with verifiable receipt chains, a TBOM standard, and
agent-native scanning.

To build: trust registry with verification API, TBOM (Trust Bill of Materials)
standard draft, agent-native scanning maturity (autonomous health monitoring,
self-healing recommendations), compliance profile engine (custom profiles, regulatory
mapping).

---

## Design Principles

These are how we decide what to build and how to build it.

- **Evidence over authority.** Everything is reproducible. No trust-me claims. If a
  server gets an A grade, the raw artifact that produced it is public and
  re-runnable.
- **Open core, commercial surface.** The evaluation engine is MIT. The fleet
  dashboard, compliance engine, and trust registry are the commercial layer. The OSS
  tool is the distribution engine; the hosted service is the revenue engine.
- **Minimal ceremony.** `npx @kryptosai/mcp-observatory demo` is the entire
  onboarding flow. Zero config, zero arguments, instant value. Every feature is
  discoverable from that first command.
- **Machine-scale.** Every feature works for humans AND agents. CLI commands have
  matching MCP server tools. Every flag has a structured output format. Automation is
  not an afterthought — it's the primary use case.
