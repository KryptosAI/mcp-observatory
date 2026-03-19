# Release Process

The repo is GitHub-release-ready before it is npm-publish-ready.

## Versioning Approach

- artifact schema is versioned independently through `schemaVersion`
- package version follows normal semver
- breaking artifact changes require a major schema bump
- breaking package/runtime changes require a semver-major release

## Release Checklist

1. update [CHANGELOG.md](./CHANGELOG.md)
2. run `npm run release:prep`
3. create a PR and merge through the protected path
4. create the release tag on `main`
5. publish GitHub release notes using the template categories in `.github/release.yml`
6. decide whether the release is GitHub-only or npm-worthy

## npm Publish Posture

For now:

- keep the package scoped as `@kryptosai/mcp-observatory`
- do not optimize for npm distribution yet
- revisit unscoped publishing only if adoption warrants it

## Changelog vs Release Notes

- `CHANGELOG.md` is the durable project history
- GitHub release notes are the launch-facing summary for one tagged release

Use the changelog for:

- all user-visible changes worth preserving
- schema or workflow changes that affect adopters
- docs or contributor-surface changes that alter project usability

Use release notes for:

- the best story of the release
- highlighted improvements grouped by the categories in `.github/release.yml`
- links to the most important docs, artifacts, and next-step issues

## Release Notes Template

See [docs/release-notes-template.md](./docs/release-notes-template.md).
