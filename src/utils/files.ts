import { randomUUID } from "node:crypto";
import { mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export async function writeTextFileAtomic(filePath: string, content: string): Promise<void> {
  const directory = path.dirname(filePath);
  const baseName = path.basename(filePath);
  const tempDir = await mkdtemp(path.join(directory, `.${baseName}.`));
  const tempPath = path.join(tempDir, `${randomUUID()}.tmp`);

  try {
    await writeFile(tempPath, content, { encoding: "utf8", flag: "wx" });
    await rename(tempPath, filePath);
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => undefined);
    throw error;
  } finally {
    await rm(tempDir, { force: true, recursive: true }).catch(() => undefined);
  }
}
