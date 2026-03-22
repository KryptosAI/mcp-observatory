import { describe, expect, it } from "vitest";

import { generateBadgeSvg } from "../src/badge.js";

describe("generateBadgeSvg", () => {
  it("produces valid SVG", () => {
    const svg = generateBadgeSvg({ score: 95, grade: "A" });
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain("95/100");
    expect(svg).toContain("MCP Health");
  });

  it("uses correct color for each grade", () => {
    expect(generateBadgeSvg({ score: 95, grade: "A" })).toContain("#4c1");
    expect(generateBadgeSvg({ score: 85, grade: "B" })).toContain("#97ca00");
    expect(generateBadgeSvg({ score: 75, grade: "C" })).toContain("#dfb317");
    expect(generateBadgeSvg({ score: 65, grade: "D" })).toContain("#fe7d37");
    expect(generateBadgeSvg({ score: 45, grade: "F" })).toContain("#e05d44");
  });

  it("accepts custom label", () => {
    const svg = generateBadgeSvg({ score: 80, grade: "B", label: "Server Score" });
    expect(svg).toContain("Server Score");
    expect(svg).not.toContain("MCP Health");
  });

  it("includes accessibility attributes", () => {
    const svg = generateBadgeSvg({ score: 90, grade: "A" });
    expect(svg).toContain('role="img"');
    expect(svg).toContain("<title>");
  });
});
