import { readFile } from "node:fs/promises";

const file = process.argv[2] ?? "docs/mcp-observatory-pr-body.md";

try {
  const body = await readFile(file, "utf8");
  process.stdout.write(body);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Could not read ${file}: ${message}\n`);
  process.exitCode = 1;
}
