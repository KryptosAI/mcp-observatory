import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import type { RunArtifact } from "../types.js";
import { makeCheckResult, type ObservedCheck } from "./base.js";

type Capability = "file-read" | "file-write" | "shell-exec" | "network-fetch" |
  "secret-access" | "env-access" | "database-query" | "docker-container";
export type ToxicFlowCategory = "exfiltration" | "credential-theft" | "remote-exec" |
  "network-to-file" | "boundary-review" | "shadow-collision";
export interface ToxicFlowFinding {
  flowId: string;
  ruleId: string;
  category: ToxicFlowCategory;
  severity: "medium";
  confidence: "capability-combination" | "name-collision";
  disposition: "review";
  servers: [string, string];
  tools: [string, string];
  description: string;
  evidence: {
    source: { targetId: string; runId: string; tool: string; basis: string[] };
    sink: { targetId: string; runId: string; tool: string; basis: string[] };
    dataFlowVerified: false;
    sharedAgentAccessVerified: false;
    namespaceVerified: false;
  };
}
export interface ToxicFlowOptions { expectedTargetIds?: string[]; maxArtifacts?: number; maxTools?: number; maxPairs?: number; maxFindings?: number }
export interface ToxicFlowAnalysis {
  schemaVersion: "toxic-flow-v1";
  status: "complete" | "incomplete";
  findings: ToxicFlowFinding[];
  coverage: {
    targets: Array<{targetId:string;runId:string;createdAt:string;tools:number}>;
    pairsReviewed: number;
    diagnostics: Array<{targetId:string;reason:string}>;
    limits: {maxArtifacts:number;maxTools:number;maxPairs:number;maxFindings:number};
    scope: string;
  };
}
interface ToolSurface { targetId:string; runId:string; tool:string; capabilities:Map<Capability,string[]> }
const SCOPE = "Review of supplied tools/list inventories using tool names and selected top-level input field names. " +
  "No tool execution, output-to-input trace, shared-agent authorization, egress policy, namespace or exploit verification. " +
  "Coverage is limited to supplied snapshots; pagination and later tool changes are unverified. " +
  "Complete inventory analysis is not a safety certification.";
const PATTERNS: Array<[Capability,RegExp]> = [
  ["file-read", /\b(?:read|get|open|download)\b.*\bfile\b/],
  ["file-write", /\b(?:write|create|save|put)\b.*\bfile\b/],
  ["shell-exec", /\b(?:exec|execute|shell|bash|command|spawn|eval)\b/],
  ["network-fetch", /\b(?:fetch|http|request|webhook|curl|wget)\b/],
  ["secret-access", /\b(?:get|read|list|retrieve)\b.*\b(?:secrets?|credentials?|passwords?|tokens?|api key)\b/],
  ["env-access", /\b(?:get|read|list)\b.*\b(?:env|environment|config)\b/],
  ["database-query", /\b(?:query|sql|select)\b/],
  ["docker-container", /\b(?:docker|container|pod|kube)\b/],
];
const RULES: Array<{source:Capability;sink:Capability;category:ToxicFlowCategory;description:string}> = [
  {source:"file-read",sink:"network-fetch",category:"exfiltration",description:"File-read and network tools coexist. Review whether file contents can be sent to an uncontrolled destination."},
  {source:"secret-access",sink:"network-fetch",category:"credential-theft",description:"Secret-read and network tools coexist. Review secret exposure, destination controls and caller authorization."},
  {source:"env-access",sink:"network-fetch",category:"credential-theft",description:"Environment-read and network tools coexist. Review whether sensitive configuration can cross the intended boundary."},
  {source:"database-query",sink:"network-fetch",category:"exfiltration",description:"Query and network tools coexist. Review query-result handling and destination controls."},
  {source:"network-fetch",sink:"file-write",category:"network-to-file",description:"Network and file-write tools coexist. Review downloaded content handling and writable paths."},
  {source:"network-fetch",sink:"shell-exec",category:"remote-exec",description:"Network and execution tools coexist. Review whether downloaded content can become executable input."},
  {source:"docker-container",sink:"file-write",category:"boundary-review",description:"Container and file-write tools coexist. Review mounts and write scope; this is not evidence of container escape."},
  {source:"docker-container",sink:"shell-exec",category:"boundary-review",description:"Container and execution tools coexist. Review execution identity and isolation; host compromise is unverified."},
];
function isRecord(value: unknown): value is Record<string,unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
function classify(tool:string,schema:unknown): Map<Capability,string[]> {
  const result = new Map<Capability,string[]>();
  const words = tool.replace(/([a-z])([A-Z])/g,"$1 $2").replace(/[_./:-]+/g," ").toLowerCase();
  for (const [role,pattern] of PATTERNS) if (pattern.test(words)) result.set(role,["Tool name suggests " + role + "."]);
  // Input credentials often authenticate a call; they do not demonstrate secret-reading capability.
  const properties = isRecord(schema) && isRecord(schema["properties"]) ? schema["properties"] : undefined;
  if (properties && ["url","uri","endpoint","hostname"].some(key => Object.hasOwn(properties,key))) {
    result.set("network-fetch",[...result.get("network-fetch") ?? [],"Top-level destination field suggests network access."]);
  }
  if (properties && ["command","shell_command","executable"].some(key => Object.hasOwn(properties,key))) {
    result.set("shell-exec",[...result.get("shell-exec") ?? [],"Top-level execution field suggests command access."]);
  }
  return result;
}

export function analyzeToxicFlows(artifacts: RunArtifact[], options:ToxicFlowOptions = {}): ToxicFlowAnalysis {
  const limits = {maxArtifacts:options.maxArtifacts ?? 100,maxTools:options.maxTools ?? 1000,
    maxPairs:options.maxPairs ?? 100000,maxFindings:options.maxFindings ?? 1000};
  const result:ToxicFlowAnalysis = {schemaVersion:"toxic-flow-v1",status:"complete",findings:[],
    coverage:{targets:[],pairsReviewed:0,diagnostics:[],limits,scope:SCOPE}};
  const problem = (targetId:string,reason:string) => { result.status="incomplete"; result.coverage.diagnostics.push({targetId,reason}); };
  if (Object.values(limits).some(value => !Number.isSafeInteger(value) || value <= 0)) {
    problem("(inventory)","Resource limits must be positive safe integers."); return result;
  }
  if (artifacts.length > limits.maxArtifacts) problem("(inventory)","Artifact limit reached.");
  const selected = artifacts.slice(0,limits.maxArtifacts);
  const counts = new Map<string,number>();
  for (const artifact of selected) counts.set(artifact.target.targetId,(counts.get(artifact.target.targetId) ?? 0)+1);
  for (const target of options.expectedTargetIds ?? []) if (!counts.has(target)) problem(target,"Expected target has no run artifact.");
  const surfaces:ToolSurface[] = [];
  for (const artifact of selected) {
    const targetId = artifact.target.targetId;
    if (counts.get(targetId) !== 1) { problem(targetId,"Duplicate target identity; inventories cannot be assigned unambiguously."); continue; }
    const checks = artifact.checks.filter(check => check.id === "tools");
    if (artifact.fatalError || checks.length !== 1) { problem(targetId,"A unique, successful tools inventory is unavailable."); continue; }
    const check = checks[0]!;
    const inventories = check.evidence.filter(evidence => evidence.endpoint === "tools/list");
    if (inventories.length !== 1) { problem(targetId,"A unique tools/list observation is unavailable."); continue; }
    const inventory = inventories[0]!;
    if (check.status === "unsupported" && inventory.advertised === false) {
      result.coverage.targets.push({targetId,runId:artifact.runId,createdAt:artifact.createdAt,tools:0}); continue;
    }
    const names = inventory.identifiers;
    if (check.status !== "pass" || !inventory.advertised || !inventory.responded || !inventory.minimalShapePresent || !names ||
        !Number.isSafeInteger(inventory.itemCount) || inventory.itemCount !== names.length ||
        names.some(name => typeof name !== "string" || !name.trim() || name.length > 512) || new Set(names).size !== names.length) {
      problem(targetId,"Tools enumeration is failed, incomplete or inconsistent; no safety conclusion is available."); continue;
    }
    if (surfaces.length + names.length > limits.maxTools) { problem(targetId,"Tool inventory limit reached."); continue; }
    result.coverage.targets.push({targetId,runId:artifact.runId,createdAt:artifact.createdAt,tools:names.length});
    for (const tool of names) {
      const schema = inventory.schemas && Object.hasOwn(inventory.schemas,tool) ? inventory.schemas[tool] : undefined;
      surfaces.push({targetId,runId:artifact.runId,tool,capabilities:classify(tool,schema)});
    }
  }
  if (result.coverage.targets.length < 2) problem("(inventory)","At least two unambiguous target inventories are required for cross-server review.");
  surfaces.sort((a,b) => JSON.stringify([a.targetId,a.tool]).localeCompare(JSON.stringify([b.targetId,b.tool]),"en"));
  const seen = new Set<string>();
  let stopped = false;
  const add = (source:ToolSurface,sink:ToolSurface,ruleId:string,category:ToxicFlowCategory,description:string,
    sourceBasis:string[],sinkBasis:string[],collision=false) => {
    const identity = JSON.stringify([ruleId,source.targetId,source.tool,sink.targetId,sink.tool]);
    if (seen.has(identity)) return;
    seen.add(identity);
    if (result.findings.length >= limits.maxFindings) { problem("(inventory)","Finding limit reached."); stopped=true; return; }
    result.findings.push({flowId:"toxic-flow/"+createHash("sha256").update(identity).digest("hex").slice(0,24),
      ruleId,category,severity:"medium",confidence:collision?"name-collision":"capability-combination",disposition:"review",
      servers:[source.targetId,sink.targetId],tools:[source.tool,sink.tool],description,
      evidence:{source:{targetId:source.targetId,runId:source.runId,tool:source.tool,basis:sourceBasis},
        sink:{targetId:sink.targetId,runId:sink.runId,tool:sink.tool,basis:sinkBasis},
        dataFlowVerified:false,sharedAgentAccessVerified:false,namespaceVerified:false}});
  };
  for (let i=0;i<surfaces.length && !stopped;i++) {
    for (let j=i+1;j<surfaces.length && !stopped;j++) {
      const a=surfaces[i]!, b=surfaces[j]!;
      if (a.targetId === b.targetId) continue;
      if (result.coverage.pairsReviewed >= limits.maxPairs) { problem("(inventory)","Tool-pair comparison limit reached."); stopped=true; break; }
      result.coverage.pairsReviewed++;
      for (const [source,sink] of [[a,b],[b,a]] as const) {
        for (const rule of RULES) {
          const sourceBasis=source.capabilities.get(rule.source), sinkBasis=sink.capabilities.get(rule.sink);
          if (sourceBasis && sinkBasis) add(source,sink,rule.source+"->"+rule.sink,rule.category,rule.description,sourceBasis,sinkBasis);
          if (stopped) break;
        }
        if (stopped) break;
      }
      if (!stopped && a.tool === b.tool) add(a,b,"exact-name-collision","shadow-collision",
        "Two targets advertise the exact same tool name. Review caller namespacing and routing; actual shadowing is unverified.",
        ["Exact advertised name."],["Exact advertised name."],true);
    }
  }
  return result;
}

/** Convenience only: use analyzeToxicFlows for any decision requiring coverage. */
export function detectToxicFlows(artifacts:RunArtifact[]):ToxicFlowFinding[] { return analyzeToxicFlows(artifacts).findings; }
export function renderToxicFlowFindings(findings:ToxicFlowFinding[]):string {
  return findings.map(f => `REVIEW ${f.ruleId}: ${JSON.stringify(f.servers[0])}/${JSON.stringify(f.tools[0])} -> ` +
    `${JSON.stringify(f.servers[1])}/${JSON.stringify(f.tools[1])}\n  ${f.description}`).join("\n");
}
export function renderToxicFlowAnalysis(analysis:ToxicFlowAnalysis):string {
  return [`Cross-server review: ${analysis.findings.length} advisory signals; inventory coverage ${analysis.status}.`,SCOPE,
    renderToxicFlowFindings(analysis.findings),...analysis.coverage.diagnostics.map(d => `INCOMPLETE ${JSON.stringify(d.targetId)}: ${d.reason}`)]
    .filter(Boolean).join("\n")+"\n";
}
export function runToxicFlowCheck(artifacts:RunArtifact[],options:ToxicFlowOptions = {}):ObservedCheck {
  const start=performance.now(), analysis=analyzeToxicFlows(artifacts,options);
  return {result:makeCheckResult("toxic-flow",analysis.status === "incomplete" || analysis.findings.length ? "partial":"pass",
    performance.now()-start,`${analysis.findings.length} advisory combinations; coverage ${analysis.status}. No exploit verification.`,
    [{endpoint:"toxic-flow/inventory",advertised:true,responded:analysis.coverage.targets.length>=2,
      minimalShapePresent:analysis.status === "complete",itemCount:analysis.findings.length,
      diagnostics:[SCOPE,...analysis.coverage.diagnostics.map(d => `${JSON.stringify(d.targetId)}: ${d.reason}`)],
      responseSnapshots:{coverage:analysis.coverage},findings:analysis.findings.map(f => ({...f}))}])};
}
