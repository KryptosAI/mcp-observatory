import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { writeBaselineInputs } from "../scripts/run-mcp-diff-baseline.js";

describe("baseline temporary inputs",()=>{
  it("isolates simultaneous pairs, confines schema names to JSON, and restricts file permissions",()=>{
    const root=mkdtempSync(path.join(tmpdir(),"baseline-temp-test-"));
    try {
      const sentinel=path.join(root,"untouched");writeFileSync(sentinel,"unchanged");
      const a=writeBaselineInputs({"../../untouched":{type:"object"}},{},root);
      const b=writeBaselineInputs({}, {tool:{type:"object"}},root);
      expect(path.dirname(a.baseFile)).not.toBe(path.dirname(b.baseFile));
      expect(path.dirname(a.baseFile)).toBe(path.dirname(a.headFile));
      expect(path.dirname(path.dirname(a.baseFile))).toBe(root);
      expect(readFileSync(sentinel,"utf8")).toBe("unchanged");
      expect(JSON.parse(readFileSync(a.baseFile,"utf8"))).toEqual([{name:"../../untouched",description:"",inputSchema:{type:"object"}}]);
      expect(JSON.parse(readFileSync(b.baseFile,"utf8"))).toEqual([]);
      if(process.platform!=="win32") {
        expect(statSync(path.dirname(a.baseFile)).mode & 0o077).toBe(0);
        expect(statSync(a.baseFile).mode & 0o077).toBe(0);
        expect(statSync(a.headFile).mode & 0o077).toBe(0);
      }
    } finally {rmSync(root,{recursive:true,force:true});}
  });
});
