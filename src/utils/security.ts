import path from "node:path";

const ALLOWED_COMMANDS = new Set([
  "npx",
  "node",
  "python",
  "python3",
  "uvx",
  "docker",
  "deno",
  "bun",
]);

const DANGEROUS_ARG_PATTERN = /[;|`]|\$\(|&&|\|\|/;

export function validateArgs(args: string[]): void {
  for (const arg of args) {
    if (DANGEROUS_ARG_PATTERN.test(arg)) {
      throw new Error(
        `Argument "${arg}" contains shell metacharacters and was rejected. ` +
        `Remove characters like ; | && || $() or backticks.`
      );
    }
  }
}

export function validateCommand(command: string): void {
  const base = path.basename(command.split(/\s+/)[0] ?? "");
  if (!ALLOWED_COMMANDS.has(base)) {
    throw new Error(
      `Command "${base}" is not in the MCP server allowlist. ` +
      `Allowed executables: ${[...ALLOWED_COMMANDS].join(", ")}. ` +
      `Use the CLI for arbitrary commands.`
    );
  }
}

export function validatePath(filePath: string, allowedRoot: string): string {
  const resolved = path.resolve(filePath);
  const root = path.resolve(allowedRoot);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new Error(
      `Path "${filePath}" resolves outside allowed directory "${allowedRoot}".`
    );
  }
  return resolved;
}
