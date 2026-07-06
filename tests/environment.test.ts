import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { detectEnvironment } from "../src/environment.js";

async function tempProject(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), "obs-env-test-"));
}

describe("detectEnvironment", () => {
  it("detects Node.js/TypeScript in the observatory repo itself", async () => {
    const env = await detectEnvironment(process.cwd());
    expect(env.languages).toContain("Node.js / JavaScript / TypeScript");
    expect(env.cicd).toContain("GitHub Actions");
  });

  it("returns empty arrays for a directory with no project files", async () => {
    const dir = await tempProject();
    try {
      const env = await detectEnvironment(dir);
      expect(env.languages).toEqual([]);
      expect(env.frameworks).toEqual([]);
      expect(env.databases).toEqual([]);
      expect(env.cloud).toEqual([]);
      expect(env.services).toEqual([]);
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it("detects project language, framework, CI, cloud, database, and service signals", async () => {
    const dir = await tempProject();
    try {
      await mkdir(path.join(dir, ".github", "workflows"), { recursive: true });
      await mkdir(path.join(dir, "prisma"), { recursive: true });
      await writeFile(path.join(dir, "package.json"), "{}\n", "utf8");
      await writeFile(path.join(dir, "pyproject.toml"), "[project]\n", "utf8");
      await writeFile(path.join(dir, "next.config.ts"), "export default {}\n", "utf8");
      await writeFile(path.join(dir, "prisma", "schema.prisma"), "datasource db {}\n", "utf8");
      await writeFile(path.join(dir, "vercel.json"), "{}\n", "utf8");
      await writeFile(path.join(dir, "Dockerfile"), "FROM node:22\n", "utf8");
      await writeFile(path.join(dir, "docker-compose.yml"), [
        "services:",
        "  postgres:",
        "    image: postgres:16",
        "  redis:",
        "    image: redis:7",
        "  kafka:",
        "    image: bitnami/kafka",
      ].join("\n"), "utf8");
      await writeFile(path.join(dir, ".env"), [
        "# comments are ignored",
        "",
        "DATABASE_URL=postgres://example",
        "REDIS_URL=redis://example",
        "STRIPE_SECRET_KEY=sk_test",
        "SENTRY_DSN=https://example",
        "OPENAI_API_KEY=token",
        "SUPABASE_URL=https://example",
      ].join("\n"), "utf8");

      const env = await detectEnvironment(dir);

      expect(env.languages).toEqual(expect.arrayContaining(["Node.js / JavaScript / TypeScript", "Python"]));
      expect(env.frameworks).toEqual(expect.arrayContaining(["Next.js", "Prisma"]));
      expect(env.cicd).toContain("GitHub Actions");
      expect(env.cloud).toEqual(expect.arrayContaining(["Vercel", "Docker", "Docker Compose"]));
      expect(env.databases).toEqual(expect.arrayContaining(["postgres", "redis", "kafka", "database"]));
      expect(env.services).toEqual(expect.arrayContaining(["Stripe", "Sentry", "OpenAI", "Supabase", "Database", "Redis"]));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("deduplicates repeated signals and ignores malformed env lines", async () => {
    const dir = await tempProject();
    try {
      await writeFile(path.join(dir, "requirements.txt"), "", "utf8");
      await writeFile(path.join(dir, "setup.py"), "", "utf8");
      await writeFile(path.join(dir, ".env.local"), [
        "NO_EQUALS_LINE",
        "=NO_KEY",
        "POSTGRES_URL=postgres://example",
        "POSTGRES_SECRET=secret",
        "POSTGRES_TOKEN=token",
      ].join("\n"), "utf8");

      const env = await detectEnvironment(dir);

      expect(env.languages.filter((language) => language === "Python")).toHaveLength(1);
      expect(env.databases.filter((database) => database === "postgres")).toHaveLength(1);
      expect(env.services.filter((service) => service === "PostgreSQL")).toHaveLength(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("returns empty detection for a missing directory", async () => {
    const env = await detectEnvironment(path.join(os.tmpdir(), "obs-env-missing-dir"));

    expect(env.languages).toEqual([]);
    expect(env.databases).toEqual([]);
    expect(env.frameworks).toEqual([]);
    expect(env.services).toEqual([]);
  });
});
