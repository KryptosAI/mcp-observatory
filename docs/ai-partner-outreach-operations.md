# AI-Assisted Partner Outreach Operations

The purpose is to book qualified partner conversations, not send high-volume prospect spam. AI prepares research, drafts messages, and triages replies; a human owns claims, final sends, contracts, and live conversations.

## Target list

Build a list of 30 firms:

- 10 DevSecOps consultancies with CI, GitHub, or cloud-security practices
- 10 AI-agent integrators implementing internal agent workflows
- 10 AI-security advisors with assessment or red-team engagements

Each record must contain: firm, public URL, practice focus, one evidence-backed reason MCP approval could matter, contact name, public business email/contact path, source URL, and status. Do not use private data or guessed email addresses.

## AI workflow

1. Research the firm's public site and produce a three-sentence account brief with citations/URLs.
2. Reject firms without enterprise implementation or security-advisory work.
3. Draft a 90-word first email using the account brief. Never invent customers, outcomes, or personal familiarity.
4. Human approves the prospect and first message. The sequence may then schedule two follow-ups: day 4 and day 10.
5. AI labels replies: `interested`, `not-now`, `not-fit`, `referral`, `unsubscribe`, or `needs-human`.
6. Stop immediately on opt-out, rejection, or no public business-contact basis.

## Sequence

### First message

Subject: A fixed MCP approval offer for your agent clients

Hi {{first_name}},

{{one factual sentence about the firm's public AI, DevSecOps, or security-advisory practice}}

We built MCP Observatory around a narrow problem: before a production agent depends on MCP tools, a platform or security owner needs an evidence-backed approve, gate, or defer decision. The fixed Release Gate Pilot covers 1-3 servers in ten business days and produces CI/SARIF evidence plus owner-ready remediation.

We work through a small number of consultancies and AI-security advisors. Partners retain the client relationship and receive 25% of collected first-year revenue for qualified referrals.

Would a 20-minute conversation be useful to decide whether this fits your practice?

### Follow-up 1 (day 4)

Hi {{first_name}},

One reason this may fit your practice: it gives a client a bounded pre-production MCP decision without asking your team to build a new scanner or run a general AI-security engagement.

If agent/tool approval is not part of your work, I will close the loop.

### Follow-up 2 (day 10)

Hi {{first_name}},

Closing the loop. The partner offer and qualification criteria are here: https://mcp-observatory.com/partners/

If there is a more relevant person on your team, a redirect is welcome.

## CRM stages and weekly scorecard

Use the following stages: `targeted`, `approved`, `sent`, `replied`, `partner-call`, `active-partner`, `buyer-intro`, `qualified-buyer`, `proposal`, `deposit`, `closed-lost`.

Every Friday report: new approved partners, emails sent, positive replies, partner calls, active partners, qualified buyer introductions, proposals, deposits, and source of each opportunity. Do not report raw opens, generic website traffic, or anonymous telemetry as business traction.
