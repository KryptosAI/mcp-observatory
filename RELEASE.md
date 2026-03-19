# Release Process

The repo is GitHub-release-ready before it is npm-publish-ready.

## Versioning Approach

- artifact schema is versioned independently through `schemaVersion`
- package version follows normal semver
- breaking artifact changes require a major schema bump
- breaking package/runtime changes require a semver-major release

## Release Checklist

1. update [CHANGELOG.md](./CHANGELOG.md)
2. run `node scripts/release.mjs`
3. confirm `npm run integration:real` still works locally
4. create a git tag
5. publish GitHub release notes using the template categories in `.github/release.yml`
6. decide whether the release is GitHub-only or npm-worthy

## npm Publish Posture

For now:

- keep the package scoped as `@kryptosai/mcp-observatory`
- do not optimize for npm distribution yet
- revisit unscoped publishing only if adoption warrants it
