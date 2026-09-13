import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const output = process.argv[2];
if (!output) throw new Error("Pass an output directory for both manuscript PDFs");
const outputDir = path.resolve(output);
mkdirSync(outputDir, { recursive: true });
const docs = path.join(root, "docs");
const markdown = path.join(docs, "permission-delta-paper.md");
const hash = createHash("sha256").update(readFileSync(markdown)).digest("hex");
console.log(execFileSync("pandoc", ["--version"], { encoding: "utf8" }).split("\n")[0]);
console.log(execFileSync("tectonic", ["--version"], { encoding: "utf8" }).trim());
const body = execFileSync("pandoc", [markdown, "--from=markdown", "--to=latex", "--natbib", "--wrap=none"], {
  encoding: "utf8", timeout: 30_000, maxBuffer: 1_048_576,
});
writeFileSync(path.join(docs, "permission-delta-paper-body.tex"), "% Markdown SHA-256: " + hash + "\n" + body);
for (const name of ["permission-delta-paper", "permission-delta-paper-anonymous"]) {
  execFileSync("tectonic", ["--keep-logs", "--outdir", outputDir, name + ".tex"], {
    cwd: docs, stdio: "inherit", timeout: 120_000,
  });
}
