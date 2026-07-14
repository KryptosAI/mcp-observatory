import { describe, expect, it } from "vitest";

import { firstNextStep, formatConnectionFailureDiagnosis } from "../src/utils/failure-diagnosis.js";
import type { TargetConfig } from "../src/types.js";

const target: TargetConfig = {
  targetId: "test",
  adapter: "local-process" as const,
  command: "test-cmd",
  args: [],
};

describe("firstNextStep", () => {
  it("extracts the first next-step bullet from a formatted diagnosis", () => {
    const diagnosis = formatConnectionFailureDiagnosis(target, "MCP error -32000: Connection closed", []);
    expect(firstNextStep(diagnosis)).toBe(
      "Run the command manually and look for usage output, auth prompts, or crash text.",
    );
  });

  it("returns undefined for text with no Next steps section", () => {
    expect(firstNextStep("just a plain error message")).toBeUndefined();
  });

  it("returns undefined when Next steps: is the last line with nothing after it", () => {
    expect(firstNextStep("Diagnosis: x\nNext steps:")).toBeUndefined();
  });
});
