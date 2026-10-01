// Run with: node --import tsx scripts/extract-permission-release-cases.mjs SOURCE_DIR
// SOURCE_DIR holds the six immutable upstream files in SOURCES below. The
// reviewed Notion converter is executed locally only after every hash matches.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SOURCES = [
  ["notion-base.json", "makenotion/notion-mcp-server", "7e254df95e805861db8c052f5c325a1bb77a7560", "scripts/notion-openapi.json", "2564039e86f4318021736368992591ef9768e9d8e7935999519b10186480153f"],
  ["notion-head.json", "makenotion/notion-mcp-server", "d282ce9c167d34705bc24074c856c84cba0f3344", "scripts/notion-openapi.json", "d33548174dfc6ebad012fc73b1483532c7887d8c97fd6deb62d56c742e96baba"],
  ["notion-parser.ts", "makenotion/notion-mcp-server", "d282ce9c167d34705bc24074c856c84cba0f3344", "src/openapi-mcp-server/openapi/parser.ts", "b7109dfabc2fa12b97c29a8f7b8c126dc60c9fcfcb9e829fb09321b5ac8193bc"],
  ["notion-proxy.ts", "makenotion/notion-mcp-server", "d282ce9c167d34705bc24074c856c84cba0f3344", "src/openapi-mcp-server/mcp/proxy.ts", "83263d50dd40658f329ed437ec8f3bfcf4a3927e273143ed66fb897df6b19ff4"],
  ["github-base.snap", "github/github-mcp-server", "42e5ce9b88ee289bb8d7a297c1d8a580e06c9e86", "pkg/github/__toolsnaps__/get_file_contents.snap", "a28edcf2331403b4ab77ef06f3a47a2d018061d8c0a0c7bab6315a787edf81aa"],
  ["github-head.snap", "github/github-mcp-server", "b5e33481793a6dbca5cf688ddf391ad410042d63", "pkg/github/__toolsnaps__/get_file_contents.snap", "c3dd1c79e99ba80c92d1e1c730c48463bd9cf1182f1f61e049231cbb008d47c9"],
];
const sourceDir = process.argv[2];
if (!sourceDir) throw new Error("Pass the directory containing the six hash-pinned upstream source files");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const sources = SOURCES.map(([file, repo, commit, sourcePath, sha256]) => {
  assert.equal(hash(readFileSync(path.join(sourceDir, file))), sha256, "Upstream source hash mismatch: " + file);
  return { file, url: "https://raw.githubusercontent.com/" + repo + "/" + commit + "/" + sourcePath, sha256 };
});
const read = (name) => JSON.parse(readFileSync(path.join(sourceDir, name), "utf8"));
const { OpenAPIToMCPConverter } = await import(pathToFileURL(path.resolve(sourceDir, "notion-parser.ts")).href);
const endpoint = "/v1/pages/{page_id}/markdown";
assert.equal(read("notion-base.json").paths[endpoint], undefined);
const headSpec = read("notion-head.json");
assert.deepEqual(Object.keys(headSpec.paths[endpoint]).sort(), ["get", "patch"]);
const selectedNames = ["retrieve-page-markdown", "update-page-markdown"];
const converted = new OpenAPIToMCPConverter(headSpec).convertToMCPTools().tools.API.methods;
const selected = converted.filter((method) => selectedNames.includes(method.name));
assert.equal(selected.length, 2);

// Normalize schema annotations without deleting identically named properties or
// JSON keys inside enum/default values. Preserve validation keywords verbatim.
const annotations = new Set(["description", "title", "example", "examples", "deprecated"]);
function normalize(schema) {
  if (typeof schema !== "object" || schema === null || Array.isArray(schema)) return schema;
  return Object.fromEntries(Object.entries(schema).filter(([key]) => !annotations.has(key)).map(([key, value]) => {
    if (["properties", "$defs", "definitions", "patternProperties"].includes(key)) {
      return [key, Object.fromEntries(Object.entries(value).map(([name, child]) => [name, normalize(child)]))];
    }
    if (["anyOf", "oneOf", "allOf"].includes(key)) return [key, value.map(normalize)];
    if (["items", "additionalProperties", "not"].includes(key)) return [key, normalize(value)];
    return [key, value];
  }));
}
const notionHead = Object.fromEntries(selected.map((method) => {
  const { $defs: definitions, ...schema } = method.inputSchema;
  // These two inputs contain no references, so their unused definition bank can
  // be omitted. Abort if a future extraction would make that omission unsound.
  assert.equal(JSON.stringify(schema).includes('"$ref"'), false);
  assert.ok(definitions);
  assert.equal(Object.hasOwn(schema.properties, "Notion-Version"), false);
  const name = "API-" + method.name; // Released proxy's tools/list name.
  assert.ok(name.length <= 64);
  return [name, normalize(schema)];
}));
const artifact = {
  schemaVersion: "permission-delta-release-extraction/v1",
  extractionDate: "2026-09-06",
  extractorSha256: hash(readFileSync(new URL(import.meta.url))),
  sources,
  normalization: "Remove schema annotations and unused Notion $defs; preserve all remaining converter/snapshot input keywords. Only selected changed tool contracts are included.",
  notion: { base: {}, head: notionHead },
  github: {
    base: { get_file_contents: normalize(read("github-base.snap").inputSchema) },
    head: { get_file_contents: normalize(read("github-head.snap").inputSchema) },
  },
};
writeFileSync(new URL("../docs/permission-delta-corpus/release-inputs.json", import.meta.url), JSON.stringify(artifact, null, 2) + "\n");
console.log("Verified six upstream hashes; extracted two Notion additions and the GitHub path change.");
