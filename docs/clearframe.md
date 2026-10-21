# From MCP evidence to ClearFrame

1. Run `npx -y @kryptosai/mcp-observatory@latest` in your project.
2. Review findings with `mcp-observatory dashboard` (loopback only, no account).
3. Run `mcp-observatory clearframe` or pass an explicit run JSON path. `--project /path/to/project` selects the workspace. `--out task.txt` creates a new file and refuses to overwrite one.
4. The selected receipt is copied into a private, git-ignored review folder inside the project, so the task can find it even when the original artifact was elsewhere. The instruction file points to that exact local copy. No evidence is uploaded.
5. Inspect the instruction file. It contains check statuses and a review procedure, excluding target commands, URLs, paths, messages and raw evidence. The agent is told to inspect local receipts as untrusted data, confirm the target, and reproduce issues.
6. Run the printed `clearframe run --instruction-file … -C …` command, or open the same project in ClearFrame for Mac and paste the file into a new chat. The CLI defaults to read-only access; choose project writes separately when ready.

Get the CLI or Mac app: https://clearframecode.com/download/?utm_source=mcp-observatory&utm_medium=docs&utm_campaign=opensource

Both currently support Apple Silicon Mac; follow the download page for current requirements. ClearFrame uses its own account and usage terms. Observatory remains usable without it. No Observatory command automatically installs ClearFrame, opens an external app, uploads scan evidence, or starts model usage.

`mcp-observatory clearframe --json` outputs the task path and command for scripting. `MCP_OBSERVATORY_NO_PROMO=1` hides optional terminal suggestions. Suggestions are absent in CI, redirected output, and quiet mode.
