# Release Process

## Release Bar

Do not cut a release just because a branch merged cleanly.

Every release should include at least one of:

- a real-server learning
- a report-quality improvement
- a schema trust improvement

If the diff is mostly packaging churn or generic polish, wait.

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
5. push the tag so `.github/workflows/release.yml` can:
   - build and test
   - verify the packed install path
   - attach the release tarball to GitHub
   - publish to npm when `NPM_TOKEN` is configured
6. verify the release asset install path and, if published, the npm install path

## npm Publish Posture

- keep the package scoped as `@kryptosai/mcp-observatory`
- treat installability as part of the release bar
- use GitHub release tarballs as the honest fallback when npm credentials are not configured
- revisit unscoped publishing only if adoption warrants it

## Changelog vs Release Notes

- `CHANGELOG.md` is the durable project history
- GitHub release notes are the observational summary for one tagged release

Use the changelog for:

- all user-visible changes worth preserving
- schema or workflow changes that affect adopters
- docs or contributor-surface changes that alter project usability

Use release notes for:

- what changed
- what the release taught us
- what still feels uncertain
- links to the most important docs, artifacts, and next-step issues

## Release Notes Template

See [docs/release-notes-template.md](./docs/release-notes-template.md).
