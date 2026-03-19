# Contributing

Thanks for helping make MCP Observatory sharper and more trustworthy.

## Contribution Paths

### Small

- improve report wording or evidence formatting
- add or refine README examples
- tighten issue templates or docs
- add fixture coverage for an already-supported capability

### Medium

- add a new deterministic fixture server
- improve diff messaging or artifact ergonomics
- harden error handling for local-process targets
- improve CI smoke coverage

### Advanced

- add a new adapter shape without breaking the current target contract
- add richer corpus tooling for reproducible interoperability cases
- evolve the artifact schema in an additive, backwards-compatible way

## Ground Rules

- Keep v1 CLI-first.
- Do not turn the project into a generic dashboard.
- Treat the artifact schema and Markdown report as core product surfaces.
- Preserve the project’s positioning as complementary to official conformance.

## Development

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run smoke
```

Optional but recommended before opening a larger PR:

```bash
npm run integration:real
```

## First Contribution Walkthrough

If this is your first contribution to the project, pick one of these paths:

1. Docs path: improve one README or CONTRIBUTING section and keep the change tightly scoped.
2. Reporting path: improve one Markdown report section and update the checked-in report examples.
3. Fixture path: add or refine one deterministic target or artifact in `examples/` or `tests/fixtures/`.

For each path:

- open the matching GitHub issue
- mention the specific files you plan to touch
- keep the diff small and obvious
- include the exact validation commands you ran

## Fixture Contributions

When you add a fixture:

- make it deterministic
- keep the smallest possible surface that proves the capability shape
- prefer explicit evidence over clever test machinery
- document what the fixture is proving and why it matters

The `fixture contribution` issue template is the best starting point for proposing a new case.
