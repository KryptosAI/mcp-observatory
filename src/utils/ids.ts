import { randomUUID } from "node:crypto";

export function buildRunId(date = new Date()): string {
  const timestamp = date.toISOString().replaceAll(":", "").replaceAll(".", "");
  return `run_${timestamp}_${randomUUID().slice(0, 8)}`;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
