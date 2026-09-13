import { execFileSync } from "node:child_process";
import type * as FsPromises from "node:fs/promises";
import { mkdtempSync, realpathSync, renameSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const hooks=vi.hoisted(()=>({afterOpen:undefined as ((file:unknown)=>void)|undefined,
  afterPathStat:undefined as ((file:unknown)=>void)|undefined}));
vi.mock("node:fs/promises",async(importOriginal)=>{
  const actual=await importOriginal<typeof FsPromises>();
  return {...actual,
    open:async(...args:Parameters<typeof actual.open>)=>{
      const handle=await actual.open(...args);hooks.afterOpen?.(args[0]);return handle;
    },
    lstat:async(...args:Parameters<typeof actual.lstat>)=>{
      const stat=await actual.lstat(...args);hooks.afterPathStat?.(args[0]);return stat;
    },
  };
});
import { auditSource } from "../src/checks/source-audit.js";

const roots:string[]=[];
function fixture() {
  const dir=realpathSync(mkdtempSync(path.join(tmpdir(),"source-race-fixture-")));roots.push(dir);
  const file=path.join(dir,"server.ts");writeFileSync(file,"export const value=1;");return {dir,file};
}
afterEach(()=>{
  hooks.afterOpen=undefined;hooks.afterPathStat=undefined;
  for(const dir of roots.splice(0))rmSync(dir,{recursive:true,force:true});
});
describe("source descriptor consistency",()=>{
  it("rejects a pathname replacement after opening instead of analyzing a different file identity",async()=>{
    const {file}=fixture();
    hooks.afterOpen=(opened)=>{
      if(opened!==file)return;
      renameSync(file,file+".old");writeFileSync(file,"export const replacement=2;");
    };
    const result=await auditSource(file);
    expect(result.status).toBe("incomplete");expect(result.filesScanned).toBe(0);
    expect(result.coverage.diagnostics.some(d=>d.reason.includes("identity changed"))).toBe(true);
  });
  it("rejects same-sized source modification after descriptor validation",async()=>{
    const {file}=fixture();let opened=false;
    hooks.afterOpen=(name)=>{if(name===file)opened=true;};
    hooks.afterPathStat=(name)=>{
      if(name!==file || !opened)return;
      writeFileSync(file,"export const value=2;");
      const future=new Date(Date.now()+10000);utimesSync(file,future,future);
    };
    const result=await auditSource(file);
    expect(result.status).toBe("incomplete");expect(result.filesScanned).toBe(0);
    expect(result.coverage.diagnostics.some(d=>d.reason.includes("while reading"))).toBe(true);
  });
  it.skipIf(process.platform==="win32")("does not block opening a FIFO masquerading as source",async()=>{
    const {dir}=fixture();const fifo=path.join(dir,"stream.ts");execFileSync("mkfifo",[fifo]);
    const result=await auditSource(fifo);
    expect(result.status).toBe("incomplete");expect(result.filesScanned).toBe(0);
  });
});
