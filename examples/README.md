# Examples

These files are meant to be evidence, not marketing samples.

Start with:

- [INDEX.md](./INDEX.md) for the human-readable proof map
- [matrix-summary.json](./matrix-summary.json) for the machine-readable matrix summary

## Targets

- `targets/filesystem-server.json`
- `targets/everything-server.json`
- `targets/ref-tools-server.json`
- `targets/context7-server.json`
- `targets/puppeteer-server.json`
- `targets/promptopia-server.json`
- `targets/opentofu-server.json`
- `install/filesystem-target.json`

## Artifacts

`artifacts/` contains checked-in outputs generated from real MCP servers so people can inspect the product without running anything first.

## Probes

`probes/` contains known-bad or known-noisy invocations that are still worth preserving because they prove the tool's diagnostic value.

- `probes/server-pdf-startup-fail.json`

## Reports

Markdown reports sit next to their corresponding JSON artifacts so readers can compare machine-friendly and human-friendly output surfaces side by side.

If an example does not teach something specific about a real server, it probably does not belong here.
