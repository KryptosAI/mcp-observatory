import { randomUUID } from "node:crypto";

export function buildRunId(date = new Date()): string {
  const timestamp = date.toISOString().replaceAll(":", "").replaceAll(".", "");
  return `run_${timestamp}_${randomUUID().slice(0, 8)}`;
}

export function slugify(value: string): string {
  let slug = "";
  let needsSeparator = false;
  for (const char of value.toLowerCase()) {
    const code = char.charCodeAt(0);
    const isAlphaNumeric = (code >= 97 && code <= 122) || (code >= 48 && code <= 57);
    if (isAlphaNumeric) {
      if (needsSeparator && slug.length > 0) slug += "-";
      slug += char;
      needsSeparator = false;
    } else {
      needsSeparator = slug.length > 0;
    }
    if (slug.length >= 64) break;
  }
  return slug;
}
