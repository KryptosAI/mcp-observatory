import { mkdtemp, copyFile, writeFile, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { listLocalRuns, startLocalDashboard } from "../src/local-dashboard.js";

const dirs: string[] = [];
const servers: Array<Awaited<ReturnType<typeof startLocalDashboard>>> = [];
afterEach(async () => { await Promise.all(servers.splice(0).map(s => s.close())); await Promise.all(dirs.splice(0).map(p => rm(p, { force: true, recursive: true }))); });
async function setup() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "observatory-dashboard-")); dirs.push(dir);
  await copyFile("tests/fixtures/sample-run-a.json", path.join(dir, "a.json"));
  await copyFile("tests/fixtures/sample-run-b.json", path.join(dir, "b.json"));
  const server = await startLocalDashboard(dir); servers.push(server);
  return { dir, ...server };
}

it("serves local history, filters, inspectable reports, JSON and ClearFrame tasks without an account", async () => {
  const { url } = await setup();
  const page = await (await fetch(url)).text();
  expect(page).toContain("2 receipts shown"); expect(page).toContain("ClearFrame task");
  expect(await (await fetch(url + "/?q=missing")).text()).toContain("No matching receipts");
  expect((await fetch(url + "/report?file=a.json")).headers.get("content-type")).toContain("text/html");
  expect(await (await fetch(url + "/artifact?file=a.json")).json()).toMatchObject({ artifactType: "run", gate: "pass" });
  const task = await fetch(url + "/clearframe-task?file=a.json");
  expect(task.headers.get("content-disposition")).toContain("attachment");
  expect(await task.text()).toContain("untrusted data");
});

it("rejects cross-origin requests, writes and traversal, and excludes symlinks or broken receipts", async () => {
  const { url, dir } = await setup();
  await writeFile(path.join(dir, "bad.json"), "not JSON");
  await symlink(path.join(dir, "a.json"), path.join(dir, "link.json"));
  expect(await listLocalRuns(dir)).toHaveLength(2);
  expect((await fetch(url, { headers: { Origin: "https://other.example" } })).status).toBe(403);
  expect((await fetch(url, { method: "POST" })).status).toBe(405);
  expect((await fetch(url + "/artifact?file=../package.json")).status).toBe(404);
  expect((await fetch(url)).headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
});
