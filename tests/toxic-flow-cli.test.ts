import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { analyzeToxicFlowFiles } from "../src/commands/toxic-flow.js";
import type { ToxicFlowAnalysis } from "../src/checks/toxic-flow.js";
import { makeArtifact } from "./fixtures/test-helpers.js";

const roots:string[]=[];
function setup() {
  const dir=mkdtempSync(path.join(tmpdir(),"toxic-flow-cli-"));roots.push(dir);
  const run=(...args:string[])=>spawnSync(process.execPath,["--import",import.meta.resolve("tsx"),
    fileURLToPath(new URL("../src/cli.ts",import.meta.url)),...args],{cwd:dir,encoding:"utf8",timeout:20000,
    env:{PATH:process.env["PATH"],HOME:dir,USERPROFILE:dir,XDG_CONFIG_HOME:dir,APPDATA:dir,
      CI:"1",DO_NOT_TRACK:"1",NO_COLOR:"1",NO_UPDATE_NOTIFIER:"1"}});
  const save=(targetId:string,tools:string[])=>{
    const artifact=makeArtifact([{id:"tools",capability:"tools",status:"pass",durationMs:1,message:"fixture",
      evidence:[{endpoint:"tools/list",advertised:true,responded:true,minimalShapePresent:true,itemCount:tools.length,identifiers:tools}]}]);
    artifact.target.targetId=targetId;artifact.runId="run-"+targetId;
    const file=path.join(dir,targetId+".json");writeFileSync(file,JSON.stringify(artifact));return file;
  };
  return {dir,run,save};
}
afterEach(()=>{for(const dir of roots.splice(0))rmSync(dir,{recursive:true,force:true});});
describe("cross-server review CLI",()=>{
  it("emits JSON advisory findings from saved artifacts without starting their commands",()=>{
    const {run,save}=setup();const a=save("a",["read_file"]),b=save("b",["fetch_url"]);
    // makeArtifact's command is the nonexistent 'test'; artifact review must not launch it.
    const child=run("toxic-flow",a,b,"--format","json");
    expect(child.status,child.stderr).toBe(0);
    const result=JSON.parse(child.stdout) as ToxicFlowAnalysis;
    expect(result.status).toBe("complete");expect(result.findings[0]?.tools).toEqual(["read_file","fetch_url"]);
  });
  it("preserves findings but exits 2 when any artifact could not be analyzed",()=>{
    const {dir,run,save}=setup();const a=save("a",["read_file"]),b=save("b",["fetch_url"]);
    const child=run("toxic-flow",a,b,path.join(dir,"missing.json"),"--format","json");
    expect(child.status,child.stderr).toBe(2);
    const result=JSON.parse(child.stdout) as ToxicFlowAnalysis;
    expect(result.status).toBe("incomplete");expect(result.findings).toHaveLength(1);
  });
  it("redacts invalid artifact contents and rejects directories",async()=>{
    const {dir,save}=setup();const a=save("a",["echo"]),bad=path.join(dir,"bad.json");
    writeFileSync(bad,'{"secret":"PRIVATE_FIXTURE_VALUE"}');
    const directory=path.join(dir,"directory");mkdirSync(directory);
    const result=await analyzeToxicFlowFiles([a,bad,directory]);
    expect(result.status).toBe("incomplete");expect(JSON.stringify(result)).not.toContain("PRIVATE_FIXTURE_VALUE");
    expect(result.coverage.diagnostics.filter(d=>d.targetId.startsWith("(input "))).toHaveLength(2);
  });
  it("includes advisory collision review in a real two-server scan",()=>{
    const {dir,run}=setup();
    const server=fileURLToPath(new URL("../examples/demo-mcp-server.mjs",import.meta.url));
    const config=path.join(dir,"mcp.json");
    // Discovery intentionally deduplicates identical startup commands. Use two
    // distinct real launches so both observed target identities reach the review.
    writeFileSync(config,JSON.stringify({mcpServers:{a:{command:process.execPath,args:[server]},b:{command:process.execPath,args:["--no-warnings",server]}}}));
    const child=run("scan","--config",config,"--no-attack-sim","--no-setup-ci","--quiet");
    expect(child.status,child.stderr+child.stdout).toBe(0);
    expect(child.stdout).toContain("Cross-server review: 1 advisory signals; inventory coverage complete");
    expect(child.stdout).toContain("exact-name-collision");
  },30000);
  it("makes a failed target incomplete in a real scan instead of treating it as an empty safe inventory",()=>{
    const {dir,run}=setup();const config=path.join(dir,"mcp.json");
    const server=fileURLToPath(new URL("../examples/demo-mcp-server.mjs",import.meta.url));
    writeFileSync(config,JSON.stringify({mcpServers:{a:{command:process.execPath,args:[server]},b:{command:path.join(dir,"missing-server"),args:[]}}}));
    const child=run("scan","--config",config,"--no-attack-sim","--no-setup-ci","--quiet");
    expect(child.status,child.stderr+child.stdout).toBe(2);
    expect(child.stdout).toContain("inventory coverage incomplete");
  },30000);
});
