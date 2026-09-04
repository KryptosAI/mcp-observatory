# Homepage copy

Replace the current hero and first sections with this. The SDM test: they can retell it in one breath without knowing what MCP is.

## Browser tab / social

- Title: MCP Observatory — Check the tools your agents can use
- Description: Your agents can call tools like GitHub, Slack, and files. Observatory checks those tools before the agent is allowed to use them.

## Hero

Eyebrow: AGENT WORKFLOW SAFETY

Headline: Is this agent safe to ship?

Subhead: Your agents can call tools — GitHub, Slack, files, sometimes production. Those tools are small servers your team pasted into a config. MCP is just the name of the plug. Observatory checks them before the agent is allowed to connect.

Primary button: See a scored tool ↗ → `/safety-index/`
Secondary button: Run a free scan ↗ → npm package

Keep the two `npx` command rows (local scan, then `cloud upload`).

Hero card: Kubernetes tool, 72, BLOCK. Checks in English: What can this tool do? Are the permissions too broad? Should an agent be allowed to use it?

## Example

Eyebrow: A REAL EXAMPLE

Headline: Here is a tool. We said block.

Body: This Kubernetes tool scored 72/100. Security was 0. An agent that can talk to your cluster should not get it until those findings are fixed. Click through to see the report — no install required.

## How it works

Headline: Check the tools. Then decide.

Body: Point Observatory at the tools in your agent setup. It starts them, looks at what they can do, and gives a written call: allow, review, or block.

1. Find the tools — read the agent config, list every tool the agent can reach.
2. Check them — permissions, hidden instructions, tools that changed.
3. Get a call — allow, review, or block, plus a report. Keep it in CI.
4. Optionally stop the call — runtime blocking when you want it. Local scan stays free.

## Teams

Headline: Don’t learn what the agent can do from an incident.

Allow / Review / Block — not approve / gate / defer.
Pilot is a secondary link, not the first CTA.

## Do not claim on this page

Do not say the whole agentic workflow is already enforced and taped. That loop is not one CLI yet. This page sells the tool check, in English.
