# Change Management Policy

## Development Process

All changes to MCP Observatory follow this pipeline:

1. **Feature branch** — All work happens on feature branches from `main`.
2. **Pull request** — Required for all changes. Must pass:
   - ESLint (zero new errors)
   - TypeScript type checking (`tsc --noEmit`)
   - Vitest test suite (must not regress)
3. **Code review** — At least one maintainer review required before merge.
4. **Merge to main** — Squash merge only. Linear history.

## Testing Requirements

- Unit tests required for new features
- Integration tests for API endpoints and CLI commands
- `npm test` must pass with zero failures
- CI matrix tests real MCP servers (`real-server-matrix.yml`)

## Deployment

| Component | Deployment Method | Rollback |
|---|---|---|
| API Worker | `wrangler deploy` (GitHub Actions) | `wrangler rollback` or redeploy previous version |
| Telemetry Worker | `wrangler deploy` (GitHub Actions) | `wrangler rollback` |
| Cloudflare Pages | `wrangler pages deploy` (GitHub Actions) | Redeploy previous commit |
| npm package | `semantic-release` (release.yml) | `npm unpublish` (within 72h) |

## Emergency Changes

For critical security fixes:
1. Create a hotfix branch from `main`
2. Open a PR with the fix and mark as urgent
3. After one maintainer approval, merge immediately
4. Post-incident review within 24 hours

## Version Control

- Git repository hosted on GitHub
- Semantic versioning via `semantic-release`
- All releases tagged in git
- Changelog auto-generated from conventional commits
