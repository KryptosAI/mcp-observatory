# Roadmap

Where MCP Observatory goes now that the Safety Index bet paid off, and where
each kind of work lives.

---

## The Pivot

The Safety Index target is met: 100+ entries, 175 targets live. The index was
the proof. Now the work splits by where it belongs.

- **Local OSS** is the portable evidence engine. Scan, receipts, scoring,
  attack simulation, CI gates. MIT, no account, runs anywhere.
- **Hosted (cloud)** is the trust registry and compliance layer.
  Multi-observer verification, fleet workflows, framework mappings. Not OSS.

OSS produces evidence. Hosted turns evidence into registry trust and
compliance workflows. Boundary:
[docs/commercial-boundary.md](docs/commercial-boundary.md) and
[docs/repository-boundary.md](docs/repository-boundary.md).

---

## Epics

Closed issues are absorbed here. Closed means rehomed, not dropped.

### 1. Trust / Registry

Absorbs #166 (Safety Index at scale) and #170 (observer network).

- Multi-observer receipts: each server gets receipts from independent
  observers, not one run.
- Observer identity: receipts are signed and attributable to a verifiable
  observer.
- Consensus scoring: the Safety Index score is the median across observers,
  not a single run.
- Trust tiers: servers grouped by evidence depth.
- Observer reputation: a lightweight model that rewards qualified observers.

Hosted v3 work. OSS keeps local Ed25519 receipts and verification. The
multi-observer network and the registry itself live in the hosted product.

### 2. Research

Absorbs #167 (fuzzing engine) and #224 (agent behavior simulation).

- Schema-aware fuzzing: adversarial inputs against tool schemas in a
  sandboxed, non-destructive harness.
- Agent behavior simulation: a controlled LLM sandbox observing what an
  agent actually does with a tool, to catch injection paths and misuse.

Safe-mode research bets. No timeline. Results ship only when they are
safe-mode, reproducible, and backed by checked-in evidence. Destructive or
live probing stays out of the default scanner.

### 3. Compliance

Absorbs #173 (framework audit mappings).

- SOC 2, ISO 27001, FedRAMP, PCI-DSS, GDPR, HIPAA profiles mapping findings
  to controls.

Commercial v2. OSS keeps exactly one profile: nsa-mcp. The remaining
framework profiles and the hosted compliance workflows ship in the
commercial product.

### 4. Growth

Absorbs #222 (community challenges).

- Monthly challenges: Scan Storm (most servers scanned) and Vuln Hunter
  (highest severity finding).
- Public leaderboard generated from merged PRs. Recognition badges.

Non-engineering program. It runs on the existing scan and attack-simulation
command surface and is owned outside the codebase.

---

## Near-term OSS

Live issues, in priority order.

- **Gate-check policy enforcement** — #353 (slice of #164): policy-as-code
  file, preflight `gate-check` before an agent connects, fail closed.
- **Cloud device flow** — #352: `cloud login` speaks the live `/auth/device`
  endpoints and auto-opens the URL. Makes hosted signup a real flow.
- **Shell completions** — #257: zsh and bash tab completion generated from
  the Commander tree (not a hand-maintained command list).
- **Receipt signer binding** — shipped: `signer` is part of the signed
  receipt bytes and `receipt verify` prints a public key fingerprint.

## Not in OSS

- trust registry and multi-observer network (hosted v3)
- compliance profiles beyond nsa-mcp (commercial v2)
- fuzzing and agent simulation engines (research, safe-mode only)
- hosted auth, retention, fleet coordination, private indexes

The public repo must stay runnable without a hosted account or private
credentials.
