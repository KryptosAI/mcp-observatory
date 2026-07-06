import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

describe("artifact schemas", () => {
  it("validate checked-in sample and real-server artifacts", async () => {
    const { stderr } = await execFileAsync("npm", ["run", "validate:artifacts"], {
      cwd: process.cwd(),
      env: process.env
    });

    expect(stderr).toBe("");
  }, 30_000);
});
