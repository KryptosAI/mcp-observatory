// Backward-compatible entry point. The baseline now runs the actual mcp-diff
// engine; keep this filename so older artifact instructions still work.
import { main } from "./run-mcp-diff-baseline.js";
main().catch((error) => { console.error(error); process.exitCode = 1; });
