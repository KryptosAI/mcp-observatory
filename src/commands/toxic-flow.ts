import { open } from "node:fs/promises";
import { constants } from "node:fs";
import { Option, type Command } from "commander";
import { analyzeToxicFlows, renderToxicFlowAnalysis, type ToxicFlowAnalysis } from "../checks/toxic-flow.js";
import type { RunArtifact } from "../types.js";
import { validateRunArtifact } from "../validate.js";

export async function analyzeToxicFlowFiles(files:string[]):Promise<ToxicFlowAnalysis> {
  const artifacts:RunArtifact[] = [], diagnostics:Array<{targetId:string;reason:string}> = [];
  if (files.length > 100) diagnostics.push({targetId:"(inputs)",reason:"Artifact file limit reached."});
  for (const [index,file] of files.slice(0,100).entries()) {
    try {
      const handle = await open(file,constants.O_RDONLY | constants.O_NONBLOCK);
      let contents:Buffer;
      try {
        const stat = await handle.stat();
        if (!stat.isFile() || stat.size > 10*1024*1024) throw new Error("Unsupported input size/type.");
        contents=Buffer.alloc(stat.size+1);
        let size=0;
        while (size < contents.length) {
          const chunk=await handle.read(contents,size,contents.length-size,size);
          if (!chunk.bytesRead) break;
          size+=chunk.bytesRead;
        }
        if (size !== stat.size) throw new Error("Input changed while reading.");
        contents=contents.subarray(0,size);
      } finally { await handle.close(); }
      artifacts.push(validateRunArtifact(JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(contents))));
    } catch {
      diagnostics.push({targetId:`(input ${index+1})`,reason:"Run artifact is missing, unreadable, oversized or invalid; contents omitted."});
    }
  }
  const result=analyzeToxicFlows(artifacts);
  if (diagnostics.length) { result.status="incomplete"; result.coverage.diagnostics.push(...diagnostics); }
  return result;
}
export function registerToxicFlowCommands(program:Command):void {
  program.command("toxic-flow <artifacts...>")
    .description("Review possible cross-server capability combinations from saved run JSON; does not start servers.")
    .addOption(new Option("--format <format>","Output format.").choices(["terminal","json"]).default("terminal"))
    .action(async (files:string[],options:{format:string}) => {
      const analysis=await analyzeToxicFlowFiles(files);
      process.stdout.write(options.format === "json" ? JSON.stringify(analysis,null,2)+"\n" : renderToxicFlowAnalysis(analysis));
      if (analysis.status === "incomplete") process.exitCode=2;
    });
}
