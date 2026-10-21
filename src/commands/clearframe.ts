import path from "node:path";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import type { Command } from "commander";
import { CLEARFRAME_DOWNLOAD_URL, clearframeTask, clearframeRunCommand } from "../clearframe.js";
import { defaultRunsDirectory, findLatestRunArtifact } from "../storage.js";
import { validateRunArtifact } from "../validate.js";

export function registerClearframeCommands(program: Command): void {
  program.command("clearframe")
    .description("Prepare a local MCP review task for ClearFrame CLI or the Mac app. Does not run or upload it.")
    .argument("[artifact]", "Run receipt; defaults to this project's latest scan.")
    .option("--out <file>", "New instruction file (existing files are preserved).")
    .option("--project <directory>", "Project to review.", process.cwd())
    .option("--json", "Print machine-readable task location and launch instructions.", false)
    .action(async (artifactPath: string | undefined, options: { out?: string; project: string; json: boolean }) => {
      const project = path.resolve(options.project);
      const receipt = artifactPath ?? await findLatestRunArtifact(defaultRunsDirectory(project));
      if (!receipt) throw new Error("No scan receipt found. Run mcp-observatory demo or test in your project first.");
      const artifact = validateRunArtifact(JSON.parse(await readFile(receipt, "utf8")));
      const taskPath = path.resolve(options.out ?? path.join(project, ".mcp-observatory", `clearframe-task-${Date.now()}.txt`));
      const bundleRoot = path.join(project, ".mcp-observatory", "clearframe");
      await mkdir(bundleRoot, { recursive: true });
      const bundle = await mkdtemp(path.join(bundleRoot, "review-"));
      const evidencePath = path.join(bundle, "receipt.json");
      await mkdir(path.dirname(taskPath), { recursive: true });
      try {
        await writeFile(path.join(bundle, ".gitignore"), "*\n", { flag: "wx", mode: 0o600 });
        await writeFile(evidencePath, JSON.stringify(artifact, null, 2) + "\n", { flag: "wx", mode: 0o600 });
        await writeFile(taskPath, clearframeTask(artifact, path.relative(project, evidencePath)), { flag: "wx", mode: 0o600 });
      } catch (error) {
        await rm(bundle, { recursive: true, force: true });
        throw error;
      }
      const result = {
        taskPath, receiptPath: path.resolve(receipt), evidencePath, project,
        command: clearframeRunCommand(taskPath, project), downloadUrl: CLEARFRAME_DOWNLOAD_URL,
        desktop: "Open this project in ClearFrame for Mac, then paste the instruction file into a new chat.",
        shared: false,
      };
      if (options.json) { process.stdout.write(JSON.stringify(result, null, 2) + "\n"); return; }
      process.stdout.write([
        `Local task saved: ${taskPath}`, "Review the file before sharing it with an agent.",
        `Selected evidence copied privately: ${evidencePath}`,
        "", "ClearFrame CLI (read-only by default):", `  ${result.command}`,
        "", result.desktop, `Install the CLI or Mac app: ${CLEARFRAME_DOWNLOAD_URL}`,
        "ClearFrame uses its own account and usage terms. Observatory stays free without it.", "",
      ].join("\n"));
    });
}
