import type { RunArtifact } from "../types.js";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function renderJUnit(artifact: RunArtifact): string {
  const checks = artifact.checks;
  const failures = checks.filter(c => c.status === "fail").length;
  const skipped = checks.filter(c => c.status === "skipped" || c.status === "unsupported").length;
  const totalTime = checks.reduce((sum, c) => sum + c.durationMs, 0) / 1000;

  const lines: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<testsuites>`,
    `<testsuite name="mcp-observatory" tests="${checks.length}" failures="${failures}" skipped="${skipped}" time="${totalTime.toFixed(3)}" timestamp="${artifact.createdAt}">`,
  ];

  for (const check of checks) {
    const time = (check.durationMs / 1000).toFixed(3);
    const classname = `mcp-observatory.${check.id}`;
    lines.push(`  <testcase classname="${escapeXml(classname)}" name="${escapeXml(check.message)}" time="${time}">`);

    if (check.status === "fail") {
      const diagnostics = check.evidence
        .flatMap(e => e.diagnostics ?? [])
        .join("\n");
      lines.push(`    <failure message="${escapeXml(check.message)}">${escapeXml(diagnostics)}</failure>`);
    } else if (check.status === "skipped" || check.status === "unsupported") {
      lines.push(`    <skipped message="${escapeXml(check.message)}" />`);
    } else if (check.status === "partial" || check.status === "flaky") {
      const diagnostics = check.evidence
        .flatMap(e => e.diagnostics ?? [])
        .join("\n");
      if (diagnostics) {
        lines.push(`    <system-out>${escapeXml(diagnostics)}</system-out>`);
      }
    }

    lines.push(`  </testcase>`);
  }

  if (artifact.fatalError) {
    lines.push(`  <system-err>${escapeXml(artifact.fatalError)}</system-err>`);
  }

  lines.push(`</testsuite>`);
  lines.push(`</testsuites>`);

  return lines.join("\n");
}
