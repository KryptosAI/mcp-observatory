import { mkdtemp, mkdir, copyFile, unlink, symlink, rm } from "node:fs/promises";
import type * as FsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, it, vi } from "vitest";

const mutation = vi.hoisted(() => ({ beforeOpen: undefined as (() => Promise<void>) | undefined }));
vi.mock("node:fs/promises", async importOriginal => {
  const actual = await importOriginal<typeof FsPromises>();
  return { ...actual, open: async (...args: Parameters<typeof actual.open>) => {
    const action = mutation.beforeOpen; mutation.beforeOpen = undefined;
    if (action) await action();
    return actual.open(...args);
  } };
});
import { listLocalRuns } from "../src/local-dashboard.js";

it("rejects a regular receipt replaced by an outside symlink between listing and opening", async () => {
  const base = await mkdtemp(path.join(os.tmpdir(), "observatory-race-"));
  try {
    const directory = path.join(base, "runs"); await mkdir(directory);
    const victim = path.join(directory, "a.json");
    const outside = path.join(base, "private.json");
    await copyFile("tests/fixtures/sample-run-a.json", victim);
    await copyFile("tests/fixtures/sample-run-b.json", outside);
    mutation.beforeOpen = async () => { await unlink(victim); await symlink(outside, victim); };
    expect(await listLocalRuns(directory)).toEqual([]);
    expect(mutation.beforeOpen).toBeUndefined();
  } finally { mutation.beforeOpen = undefined; await rm(base, { recursive: true, force: true }); }
});
