# Certification PR Campaign

The certification campaign creates public proof by opening small, helpful PRs that add read-only MCP Observatory checks to public MCP servers.

## Goal

Create maintainer conversations and accepted public integrations around one clear offer:

> Add MCP CI/security checks in 60 seconds.

## PR Shape

Each PR should be narrow:

- add `.github/workflows/mcp-observatory.yml`
- add `mcp-observatory.target.json` when needed
- add optional badge snippet
- keep permissions read-only by default
- avoid changing server implementation code

Generate the kit:

```bash
npx @kryptosai/mcp-observatory setup-ci --all --command "<safe startup command>"
npx @kryptosai/mcp-observatory setup-ci --doctor
```

## Target Criteria

Prioritize repos with:

- active MCP server maintenance
- clear package or local startup command
- meaningful usage, stars, directory visibility, or enterprise category
- safe CI startup without real credentials
- maintainers likely to value compatibility/security proof

Avoid repos where:

- startup requires private credentials with no fixture mode
- the server performs irreversible side effects during startup
- maintainers have already rejected third-party CI without a new reason to revisit

## Maintainer Message

```markdown
This PR adds a read-only MCP Observatory GitHub Action for MCP compatibility, schema drift, and common security checks.

It does not require an account and does not change runtime code. The workflow is read-only by default; maintainers can opt into PR comments/statuses later.

I used `setup-ci --doctor` to verify the adoption kit. If the startup command should use a repo-local build instead of the published package, I can adjust it.
```

## Weekly Quota

- 5 researched targets
- 3 opened PRs
- 1 follow-up on existing open PRs
- 1 accepted or meaningfully discussed PR converted into proof/docs

## Success Signals

- accepted workflows
- maintainer replies
- badge adoption
- directory mentions
- reference evaluations linked from maintainers
- inbound certification or pilot requests
