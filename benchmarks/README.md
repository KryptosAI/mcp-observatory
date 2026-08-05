# Public Benchmark Corpus

This directory contains small, deterministic fixtures for regression-testing MCP Observatory's public evidence rules. Fixtures do not start servers or use credentials.

Each fixture declares:

- the capability or failure class it represents;
- a minimal list of tool metadata or response evidence;
- expected rule IDs and severities;
- why the fixture is useful and what it does not prove.

`manifest.json` is the stable entry point for tooling. Add a fixture when a rule gains a regression case, an ambiguous edge case, or a benign control. Keep each fixture minimal and review expected findings as part of the change.

The corpus is open so maintainers can reproduce findings and challenge false positives. It is not a commercial ranking dataset or a hosted Safety Index.
