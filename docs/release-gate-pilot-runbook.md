# MCP Release Gate Pilot: Delivery Runbook

Use this runbook to deliver the first paid pilots consistently. The product is a bounded release decision, not a general AI-security audit.

## Product boundary

- Price: `$15,000`; use the `$10,000` founding-design-partner price only for the first two customers.
- Scope: 1-3 named MCP servers, 10 business days.
- Payment: 50% at signing, 50% before the final readout.
- Default safety boundary: no production credentials, destructive calls, secret handling, certification, or compliance attestation.

## Before accepting a pilot

Accept only when all conditions are true:

1. A named platform, engineering, or security owner is accountable for the decision.
2. The customer has private, pre-production, or production MCP use.
3. The decision is due within 60 days.
4. The customer accepts the fixed scope and price.
5. The customer can provide safe startup commands, a fixture, or metadata sufficient for evidence generation.

Decline or defer all other requests. Do not provide a free private assessment.

## Delivery sequence

1. **Kickoff (day 1):** capture server commands, owner, agent/runtime, intended authority, CI repository, and decision deadline. Confirm the safe-mode boundary in writing.
2. **Evidence (days 2-5):** create the server inventory; run the standard Observatory checks; collect JSON, Markdown/HTML, SARIF, drift baseline, and reproduction notes.
3. **Decision (days 6-7):** for each server, assign approve, gate, or defer. Tie every verdict to evidence and a named remediation owner.
4. **CI handoff (days 8-9):** configure the agreed CI gate and optional SARIF upload; document blocking policy and exceptions.
5. **Readout (day 10):** deliver the executive summary, evidence pack, remediation list, and a 30-minute owner readout.

## Required deliverables

- private inventory and scope record
- evidence pack for every reviewed server
- verdict table: server, decision, evidence, owner, next action
- CI and SARIF setup notes
- drift baseline and next-review date
- executive summary with explicit exclusions

## Founder demo script

Use only this five-part narrative in a first qualified technical call:

1. "Agents inherit the authority of the MCP tools they can call. The decision is whether this dependency should enter your production agent path."
2. "We inventory the declared surface, run safe-mode evidence, and give a named owner an approve, gate, or defer decision."
3. "This is not a penetration test or compliance certification. It is a reproducible release gate for 1-3 MCP servers."
4. "The delivery includes SARIF and CI so the decision keeps running after the pilot."
5. "If this is a current approval decision, the fixed engagement is $15,000 and completes in ten business days."

If asked a technical question outside the evidence or safe-mode boundary, say: "I will confirm that with the assessment lead and document it in scope." Do not improvise a security claim.
