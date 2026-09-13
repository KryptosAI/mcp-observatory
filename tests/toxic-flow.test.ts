import { describe, expect, it } from "vitest";
import { Ajv } from "ajv";
import { analyzeToxicFlows, detectToxicFlows, renderToxicFlowAnalysis, runToxicFlowCheck } from "../src/checks/toxic-flow.js";
import { validateRunArtifact } from "../src/validate.js";
import runSchema from "../schemas/run-artifact.schema.json" with { type: "json" };
import { makeArtifact } from "./fixtures/test-helpers.js";
import type { RunArtifact } from "../src/types.js";

export function inventory(targetId:string,names:string[],schemas?:Record<string,object>):RunArtifact {
  const artifact=makeArtifact([{id:"tools",capability:"tools",status:"pass",durationMs:1,message:"Fixture tools/list snapshot.",
    evidence:[{endpoint:"tools/list",advertised:true,responded:true,minimalShapePresent:true,itemCount:names.length,identifiers:names,schemas}]}]);
  return {...artifact,runId:"run-"+targetId,target:{...artifact.target,targetId}};
}
describe("cross-server capability review", () => {
  it.each([
    ["read_file","fetch_url","file-read->network-fetch"],
    ["get_secret","fetch_url","secret-access->network-fetch"],
    ["read_env","fetch_url","env-access->network-fetch"],
    ["query_database","fetch_url","database-query->network-fetch"],
    ["fetch_url","write_file","network-fetch->file-write"],
    ["fetch_url","execute_command","network-fetch->shell-exec"],
    ["docker_run","write_file","docker-container->file-write"],
    ["docker_run","exec","docker-container->shell-exec"],
  ])("preserves %s to %s as an advisory combination",(source,sink,ruleId) => {
    const result=analyzeToxicFlows([inventory("a",[source]),inventory("b",[sink])]);
    expect(result.status).toBe("complete");
    const finding=result.findings.find(f => f.ruleId === ruleId);
    expect(finding?.tools).toEqual([source,sink]); expect(finding?.servers).toEqual(["a","b"]);
    expect(finding?.confidence).toBe("capability-combination"); expect(finding?.disposition).toBe("review");
    expect(finding?.evidence.dataFlowVerified).toBe(false);
    expect(finding?.evidence.sharedAgentAccessVerified).toBe(false);
    expect(finding?.evidence.source.runId).toBe("run-a");
  });
  it("keeps both directions and distinct tool pairs sharing a category",() => {
    const result=analyzeToxicFlows([inventory("a",["read_file","fetch_url","query_database"]),inventory("b",["read_file","fetch_url"])]);
    const exfil=result.findings.filter(f => f.category === "exfiltration");
    expect(exfil).toHaveLength(3);
    expect(exfil.map(f=>f.servers)).toContainEqual(["a","b"]);
    expect(exfil.map(f=>f.servers)).toContainEqual(["b","a"]);
    expect(new Set(result.findings.map(f=>f.flowId)).size).toBe(result.findings.length);
  });
  it("keeps secret and environment review paths separately",() => {
    const result=analyzeToxicFlows([inventory("a",["get_secret","read_env"]),inventory("b",["fetch_url"])]);
    expect(result.findings.filter(f=>f.category === "credential-theft")).toHaveLength(2);
  });
  it("matches only exact name collisions and leaves namespacing unverified",() => {
    const a=inventory("a",["echo"]),b=inventory("b",["echo"]);
    const exact=detectToxicFlows([a,b]);
    expect(exact).toHaveLength(1); expect(exact[0]?.confidence).toBe("name-collision");
    expect(exact[0]?.evidence.namespaceVerified).toBe(false);
    expect(detectToxicFlows([a,inventory("b",["Echo"])] )).toEqual([]);
  });
  it("does not classify schema descriptions, default strings or credential inputs as access capabilities",() => {
    const a=inventory("a",["echo"],{echo:{description:"exec shell token secret http",default:"http",properties:{token:{type:"string"}}}});
    expect(analyzeToxicFlows([a,inventory("b",["fetch_url"])]).findings).toEqual([]);
  });
  it("uses top-level destination field names with an explicit heuristic basis",() => {
    const result=analyzeToxicFlows([inventory("a",["readFile"]),inventory("b",["opaque"],{opaque:{properties:{url:{type:"string"}}}})]);
    expect(result.findings[0]?.tools).toEqual(["readFile","opaque"]);
    expect(result.findings[0]?.evidence.sink.basis).toContain("Top-level destination field suggests network access.");
  });
  it("returns incomplete for absent, duplicate, failed, partial or inconsistent inventories",() => {
    const valid=inventory("a",["read_file"]);
    const mutations:Array<(artifact:RunArtifact)=>void> = [
      a=>{a.fatalError="private error text";},
      a=>{a.checks=[];},
      a=>{a.checks[0]!.status="fail";},
      a=>{a.checks[0]!.status="partial";},
      a=>{a.checks[0]!.evidence[0]!.advertised=false;},
      a=>{a.checks[0]!.evidence[0]!.responded=false;},
      a=>{a.checks[0]!.evidence[0]!.itemCount=99;},
      a=>{a.checks[0]!.evidence[0]!.identifiers=undefined;},
      a=>{a.checks[0]!.evidence[0]!.identifiers=["fetch_url","fetch_url"];a.checks[0]!.evidence[0]!.itemCount=2;},
    ];
    for (const mutate of mutations) {
      const broken=inventory("b",["fetch_url"]);mutate(broken);
      const result=analyzeToxicFlows([valid,broken]);
      expect(result.status).toBe("incomplete"); expect(result.findings).toEqual([]);
      expect(JSON.stringify(result)).not.toContain("private error text");
    }
    for (const artifacts of [[],[valid],[valid,valid]]) expect(analyzeToxicFlows(artifacts).status).toBe("incomplete");
    expect(analyzeToxicFlows([valid,inventory("b",[])],{expectedTargetIds:["a","b","missing"]}).status).toBe("incomplete");
  });
  it("supports empty observed inventories and explicitly unadvertised tool capability",() => {
    const noTools=inventory("b",[]); noTools.checks[0]!.status="unsupported";
    noTools.checks[0]!.evidence=[{endpoint:"tools/list",advertised:false,responded:false,minimalShapePresent:false}];
    expect(analyzeToxicFlows([inventory("a",[]),noTools]).status).toBe("complete");
  });
  it("does not use invocation responses as fabricated inventory capabilities",() => {
    const a=inventory("a",["echo"]);
    a.checks.push({id:"tools-invoke",capability:"tools-invoke",status:"pass",durationMs:1,message:"fixture",
      evidence:[{endpoint:"tools/call",advertised:true,responded:true,minimalShapePresent:true,schemas:{fake:{properties:{command:{},url:{}}}}}]});
    expect(analyzeToxicFlows([a,inventory("b",["read_file"])]).findings).toEqual([]);
  });
  it("marks each exhausted bound incomplete and keeps already discovered findings",() => {
    const artifacts=[inventory("a",["read_file","query_database"]),inventory("b",["fetch_url","request_url"])];
    for (const options of [{maxArtifacts:1},{maxTools:1},{maxPairs:1},{maxFindings:1},{maxPairs:0}]) {
      expect(analyzeToxicFlows(artifacts,options).status).toBe("incomplete");
    }
    expect(analyzeToxicFlows(artifacts,{maxFindings:1}).findings).toHaveLength(1);
  });
  it("uses stable identities when input order changes",() => {
    const a=inventory("a",["read_file","query_database"]),b=inventory("b",["fetch_url"]);
    expect(analyzeToxicFlows([a,b]).findings).toEqual(analyzeToxicFlows([b,a]).findings);
  });
  it("escapes untrusted names in terminal rendering",() => {
    const result=analyzeToxicFlows([inventory("a\u001b[2J",["read_file"]),inventory("b",["fetch_url\u001b[2J"])]);
    const rendered=renderToxicFlowAnalysis(result);
    expect(rendered).not.toContain("\u001b");expect(rendered).toContain("\\u001b");
  });
  it("serializes advisory findings and coverage without turning heuristics into a failing gate",() => {
    const result=runToxicFlowCheck([inventory("a",["read_file"]),inventory("b",["fetch_url"])]).result;
    expect(result.status).toBe("partial");
    expect(result.evidence[0]?.responseSnapshots?.coverage).toBeDefined();
    const artifact=makeArtifact([result]);
    expect(validateRunArtifact(JSON.parse(JSON.stringify(artifact))).checks[0]?.id).toBe("toxic-flow");
    const validate=new Ajv({strict:false}).compile(runSchema);
    expect(validate(artifact),JSON.stringify(validate.errors)).toBe(true);
    expect(runToxicFlowCheck([]).result.status).toBe("partial");
  });
});
