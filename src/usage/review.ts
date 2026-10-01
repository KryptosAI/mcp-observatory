import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { usageRequests } from "./requests.js";
import { analyzeUsage, exportUsageRegression, type IntentAnalysisOptions } from "./analytics.js";
import type { UsageStore } from "./store.js";

export interface UsageReviewOptions { port?: number; policyVersion?: string; analysis?: IntentAnalysisOptions }
/** Local evidence UI. Never expose this server publicly; remote product UIs must provide their own authentication. */
export async function startUsageReview(store: UsageStore, options: UsageReviewOptions = {}) {
  const port = options.port ?? 0;
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("Invalid loopback port");
  const token = randomUUID(), nonce = randomUUID();
  const policyVersion = options.policyVersion ?? "usage-local-review-v1";
  let origin = "";
  const server = createServer((req, res) => { void (async () => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'`);
    const send = (status: number, value: unknown) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(value)); };
    if (req.headers.host !== new URL(origin).host || (req.headers.origin && req.headers.origin !== origin)) { send(403, { error: "Only this loopback origin is allowed" }); return; }
    const url = new URL(req.url ?? "/", origin);
    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); res.end(reviewPage(nonce, token, store.directory, policyVersion)); return;
    }
    if (req.headers["x-usage-token"] !== token) { send(403, { error: "Missing local review session" }); return; }
    try {
      if (req.method === "GET" && url.pathname === "/api/requests") {
        const events = await store.read(); send(200, { requests: usageRequests(events), analysis: await analyzeUsage(events, options.analysis) }); return;
      }
      const flag = /^\/api\/flag\/([a-f0-9-]{36})$/.exec(url.pathname);
      if (req.method === "POST" && flag) {
        const report = await store.flag(flag[1]!, { optedIn: true, userReviewed: true, reviewedAt: new Date().toISOString(), policyVersion });
        send(200, { reportId: report.id, callIds: report.callIds }); return;
      }
      const exported = /^\/api\/export\/([a-f0-9-]{36})$/.exec(url.pathname);
      if (req.method === "GET" && exported) {
        const regression = exportUsageRegression(await store.read(), exported[1]!);
        res.setHeader("Content-Disposition", `attachment; filename="regression-${exported[1]!}.json"`); send(200, regression); return;
      }
      send(404, { error: "Not found" });
    } catch (error) {
      send(error instanceof Error && /Unknown or expired/.test(error.message) ? 404 : 500, { error: "Could not load or save retained evidence. Check the local store and retry." });
    }
  })().catch(() => { if (!res.headersSent) res.writeHead(500); res.end(); }); });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(port, "127.0.0.1", () => { origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`; resolve(); }); });
  return { url: origin, close: () => new Promise<void>((resolve, reject) => { server.close(error => error ? reject(error) : resolve()); server.closeIdleConnections(); }) };
}

function reviewPage(nonce: string, token: string, directory: string, policyVersion: string): string {
  const config = JSON.stringify({ token, directory, policyVersion }).replaceAll("<", "\\u003c");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MCP Observatory · Request review</title>
<style nonce="${nonce}">
:root{font:15px/1.6 system-ui;color:#1a2540;background:#f4f6fa}*{box-sizing:border-box}body{margin:0}header,main{max-width:1180px;margin:auto;padding:24px}header{padding-bottom:8px}h1{font-size:28px;margin:0}h2{font-size:20px;margin:0 0 12px}h3{font-size:15px;margin:16px 0 5px}p{margin:8px 0}.muted{color:#526078;font-size:13px}.bar{display:flex;gap:12px;align-items:center;flex-wrap:wrap}button,input{font:inherit}button{cursor:pointer;background:#fff;color:#263b78;border:1px solid #ccd5e7;border-radius:7px;padding:9px 14px}button:hover{background:#eef2fe}button:focus-visible,input:focus-visible{outline:3px solid #4275e5;outline-offset:2px}button:disabled{cursor:default;opacity:.6}.primary{background:#244dcc;color:white}.primary:hover{background:#183bad}.layout{display:grid;grid-template-columns:330px 1fr;gap:20px;margin-top:20px}.panel{background:white;border:1px solid #dbe1ed;border-radius:10px;padding:20px;min-width:0;overflow-wrap:anywhere}.request{display:block;text-align:left;width:100%;margin:8px 0;color:#1a2540}.request[aria-pressed=true]{border-color:#244dcc;background:#eef3ff}.badge{display:inline-block;border-radius:4px;padding:2px 7px;background:#edf1f7;font-size:12px;margin-bottom:4px}.bad{background:#fde8e7;color:#9b2924}.good{background:#e3f4e8;color:#245d35}pre{background:#f7f8fc;border:1px solid #e1e6f0;border-radius:6px;padding:12px;white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.6 ui-monospace,monospace}input{width:100%;padding:9px;border:1px solid #ccd5e7;border-radius:7px}.call{border-top:1px solid #e3e7ef;margin:18px 0;padding-top:16px}table{width:100%;border-collapse:collapse;font-size:13px}th,td{padding:9px;text-align:left;border-bottom:1px solid #e1e6ef}#notice{padding:10px 0;min-height:40px}#groups{margin-top:20px;overflow:auto}[hidden]{display:none!important}@media(max-width:740px){.layout{grid-template-columns:1fr}header,main{padding:16px}.panel{padding:16px}h1{font-size:24px}}
</style></head><body><header><h1>MCP Observatory</h1><p>Request review · Understand “I asked for X, got Y” failures</p><p class="muted" id="storage"></p></header><main><div class="bar"><button id="refresh">Refresh evidence</button><span id="summary"></span></div><div id="notice" role="status" aria-live="polite"></div><div class="layout"><section class="panel"><h2>Requests</h2><label for="search">Find a request or tool</label><input id="search" type="search" placeholder="Search captured evidence"><div id="requests"></div></section><section class="panel" id="detail"><p>Select a request to inspect its evidence.</p></section></div><section class="panel" id="groups"><h2>Which intents fail most?</h2><p class="muted">Failures rank first. A tool returning successfully does not prove user satisfaction. Rates include only known outcomes.</p><div id="intentTable"></div><p class="muted" id="unclassified"></p></section></main>
<script nonce="${nonce}">
const config=${config};let data={requests:[]},selected;
const el=id=>document.getElementById(id), node=(tag,text,className)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;};
const source={user_written:'Original request · user supplied',model_summary:'Model summary · proxy, not the original wording',tool_args:'Captured tool arguments · proxy, not the original wording',unavailable:'Original request unavailable · no proxy captured'};
el('storage').textContent='Local store: '+config.directory+' · This viewer does not upload evidence.';
async function api(url,method='GET'){const response=await fetch(url,{method,headers:{'x-usage-token':config.token}});if(!response.ok)throw new Error('Could not load or save evidence. Retry or check the local store.');return response.json();}
function notice(text){el('notice').textContent=text;}
function badge(r){return r.reports.some(p=>p.flag)?'Flagged as unsatisfying':r.outcome==='failure'?'Failure':r.outcome==='success'?'User reported success':'User outcome unknown';}
function list(){const query=el('search').value.toLowerCase();el('requests').replaceChildren();const rows=data.requests.filter(r=>(r.asked+' '+r.calls.map(c=>c.tool).join(' ')).toLowerCase().includes(query)).sort((a,b)=>Number(b.outcome==='failure')-Number(a.outcome==='failure'));if(!rows.some(r=>r.id===selected)){selected=rows[0]?.id;detail();}if(!rows.length)el('requests').append(node('p','No matching retained requests.'));for(const r of rows){const b=node('button',undefined,'request');b.type='button';b.setAttribute('aria-pressed',String(selected===r.id));b.append(node('span',badge(r),'badge '+(r.outcome==='failure'?'bad':r.outcome==='success'?'good':'')),node('div',r.asked),node('div',r.calls.length+' linked tool call(s)','muted'));b.addEventListener('click',()=>{selected=r.id;list();detail();});el('requests').append(b);}}
function detail(){const target=el('detail');target.replaceChildren();const r=data.requests.find(r=>r.id===selected);if(!r){target.append(node('p','Select a request to inspect its evidence.'));return;}target.append(node('h2',source[r.provenance]),node('p',r.asked),node('p',badge(r),'badge '+(r.outcome==='failure'?'bad':'')));
const flagged=r.reports.some(p=>p.flag);const flag=node('button',flagged?'Feedback recorded':"This wasn't what I wanted",'primary');flag.disabled=flagged||!r.calls.length;flag.addEventListener('click',async()=>{flag.disabled=true;try{await api('/api/flag/'+r.calls[0].id,'POST');await load();notice('Feedback recorded and linked to '+r.calls.length+' tool call(s).');}catch(e){flag.disabled=false;notice(e.message);}});const actions=node('div',undefined,'bar');target.append(node('p','By clicking, you flag this request as unsatisfying and opt in to storing the captured request and call context shown below under '+config.policyVersion+'. No unseen transcript is collected.','muted'),actions);actions.append(flag);
const report=r.reports[0];if(report){const exportButton=node('button','Export regression case');exportButton.addEventListener('click',async()=>{try{const result=await api('/api/export/'+report.id);const a=node('a');const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'}));a.href=url;a.download='regression-'+report.id+'.json';a.click();URL.revokeObjectURL(url);}catch(e){notice(e.message);}});actions.append(exportButton);} 
if(r.missingCallIds.length)target.append(node('p','Some linked calls are no longer retained: '+r.missingCallIds.join(', '),'muted'));
for(const c of r.calls){const block=node('div',undefined,'call');block.append(node('h3',c.tool+' · '+c.server),node('p','Status: '+c.status+' · Handler latency: '+c.latencyMs.toFixed(2)+' ms','muted'),node('p','Call ID: '+c.id,'muted'),node('h3','Arguments'),node('pre',Object.keys(c.args).length?JSON.stringify(c.args,null,2):'Argument values were not captured. Enable a safe allowlist in your server integration.'),node('h3','Error'),node('pre',c.error?c.error.message:'No tool error observed. This may still be an unsatisfying result.'),node('h3','Returned result'),node('pre',Object.prototype.hasOwnProperty.call(c,'result')?JSON.stringify(c.result,null,2):'Result payload was not captured.'));target.append(block);}
if(r.reports.length){target.append(node('h3','User feedback'));for(const p of r.reports){target.append(node('p',p.expected),node('pre',p.got));if(p.excerpt.length){target.append(node('h3','Selected conversation excerpt'));for(const t of p.excerpt)target.append(node('pre',t.role+' ('+t.provenance+'): '+t.text));}}}
}
function groups(){el('intentTable').replaceChildren();const table=node('table'),head=node('tr');for(const title of ['Intent','Requests','Failures','Known outcomes','Unknown outcomes','Failure rate'])head.append(node('th',title));table.append(head);for(const c of data.analysis.clusters){const row=node('tr');for(const value of [c.label,c.count,c.failureRequests,c.knownOutcomes,c.unknownOutcomes,c.failureRate===null?'Unknown':Math.round(c.failureRate*100)+'%'])row.append(node('td',String(value)));table.append(row);}el('intentTable').append(table);el('unclassified').textContent=data.analysis.unclassified.length+' request(s) have no captured intent and remain unclassified. Grouping uses supplied intent labels when available, otherwise '+data.analysis.method+'.';}
async function load(){data=await api('/api/requests');if(!data.requests.some(r=>r.id===selected))selected=(data.requests.find(r=>r.outcome==='failure')||data.requests[0])?.id;el('summary').textContent=data.analysis.totalRequests+' retained requests · '+data.analysis.totalCalls+' tool calls';list();detail();groups();}
el('refresh').addEventListener('click',()=>load().then(()=>notice('Evidence refreshed.')).catch(e=>notice(e.message)));el('search').addEventListener('input',list);load().catch(e=>notice(e.message));
</script></body></html>`;
}
