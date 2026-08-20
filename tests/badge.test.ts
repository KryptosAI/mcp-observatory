import { describe, expect, it } from "vitest";

import { generateBadgeSvg } from "../src/badge.js";

describe("generateBadgeSvg", () => {
  it("produces valid SVG", () => {
    const svg = generateBadgeSvg({ score: 95, grade: "A" });
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain("Platinum");
    expect(svg).toContain("observatory");
  });

  it("uses trust-tier colors", () => {
    expect(generateBadgeSvg({ score: 95, grade: "A" })).toContain("#4F46E5");
    expect(generateBadgeSvg({ score: 85, grade: "B" })).toContain("#D97706");
    expect(generateBadgeSvg({ score: 70, grade: "C" })).toContain("#64748B");
    expect(generateBadgeSvg({ score: 55, grade: "D" })).toContain("#C2410C");
    expect(generateBadgeSvg({ score: 40, grade: "F" })).toContain("#6B7280");
  });

  it("labels the right-hand side with the tier name", () => {
    expect(generateBadgeSvg({ score: 92, grade: "A" })).toContain("Platinum");
    expect(generateBadgeSvg({ score: 80, grade: "B" })).toContain("Gold");
    expect(generateBadgeSvg({ score: 65, grade: "D" })).toContain("Silver");
    expect(generateBadgeSvg({ score: 50, grade: "F" })).toContain("Bronze");
    expect(generateBadgeSvg({ score: 0, grade: "F" })).toContain("Unrated");
  });

  it("accepts custom label", () => {
    const svg = generateBadgeSvg({ score: 80, grade: "B", label: "Server Score" });
    expect(svg).toContain("Server Score");
    expect(svg).not.toContain("observatory");
  });

  it("includes accessibility attributes", () => {
    const svg = generateBadgeSvg({ score: 90, grade: "A" });
    expect(svg).toContain('role="img"');
    expect(svg).toContain("<title>");
    expect(svg).toContain("observatory: Platinum");
  });
});
