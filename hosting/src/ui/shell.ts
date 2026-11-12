import { designCss } from "./library.js";

// Consumer layout only. Type, colors, controls and geometry belong to the library.
const layout = `
*{box-sizing:border-box}body{margin:0;background:var(--cf-canvas);color:var(--cf-text)}
a{color:var(--cf-action);text-underline-offset:.2em}p{max-width:80ch}code{overflow-wrap:anywhere}
.obs-shell{max-width:80rem;margin:auto;padding:var(--cf-space-8)}
.obs-topbar{border-bottom:1px solid var(--cf-outline)}.obs-topbar>div{display:flex;align-items:center;justify-content:space-between;gap:var(--cf-space-4);padding-block:var(--cf-space-4);flex-wrap:wrap}
.obs-brand{font-weight:var(--cf-weight-semibold);text-decoration:none;color:var(--cf-text)}
.obs-heading{display:flex;align-items:start;justify-content:space-between;gap:var(--cf-space-6);flex-wrap:wrap;margin-bottom:var(--cf-space-8)}
.obs-heading h1{margin:0}.obs-muted{color:var(--cf-muted)}.obs-search{display:flex;align-items:end;gap:var(--cf-space-3);flex-wrap:wrap;margin-bottom:var(--cf-space-6)}
.obs-heading h1.cf-heading-2xl{font-size:var(--cf-heading-2xl-size)!important;line-height:var(--cf-heading-2xl-line)!important}.cf-empty h1.cf-heading-l{font-size:var(--cf-heading-l-size)!important;line-height:var(--cf-heading-l-line)!important}
.obs-search>div{flex:1;min-width:min(12rem,100%)}.obs-scroll{overflow-x:auto;border:1px solid var(--cf-outline);border-radius:var(--cf-radius-card)}
table{width:100%;border-collapse:collapse;font-size:var(--cf-copy-s-size);line-height:var(--cf-copy-s-line)}
caption{text-align:left;padding:var(--cf-space-4);font-weight:var(--cf-weight-medium)}th,td{text-align:left;padding:var(--cf-space-3) var(--cf-space-4);border-top:1px solid var(--cf-outline);vertical-align:middle;overflow-wrap:anywhere}
th{color:var(--cf-muted);font-weight:var(--cf-weight-medium)}.obs-scroll th:first-child,.obs-scroll td:first-child{min-width:12rem}tbody tr:hover{background:var(--cf-elevated)}
.obs-actions{display:flex;gap:var(--cf-space-2);flex-wrap:nowrap}.obs-scroll .cf-badge{white-space:nowrap}.obs-number{font-family:var(--cf-font-mono);font-variant-numeric:tabular-nums;white-space:nowrap}
.obs-next{margin-top:var(--cf-space-8);padding-top:var(--cf-space-6);border-top:1px solid var(--cf-outline)}.obs-next h2{margin-top:0}
.obs-footer{margin-top:var(--cf-space-8);color:var(--cf-muted)}.obs-skip{position:absolute;top:var(--cf-space-2);left:var(--cf-space-2);transform:translateY(-200%)}.obs-skip:focus{transform:none;z-index:1}
@media(max-width:40rem){.obs-shell{padding:var(--cf-space-4)}.obs-heading{margin-bottom:var(--cf-space-6)}.obs-actions .cf-button{white-space:nowrap}.obs-scroll table{min-width:40rem}}
`;

export function designAsset(pathname: string): { body: string | Uint8Array; type: string } | undefined {
  if (pathname === "/ui/clearframe.css") return { body: designCss + layout, type: "text/css; charset=utf-8" };

  return undefined;
}

export function designFontFile(pathname: string): "inter.woff2" | "mono.woff2" | undefined {
  if (pathname === "/ui/inter.woff2") return "inter.woff2";
  if (pathname === "/ui/mono.woff2") return "mono.woff2";
  return undefined;
}

export function designPage(title: string, content: string, navigation = "", theme?: "light" | "dark"): string {
  // Titles are escaped by callers; navigation and content are trusted templates
  // whose receipt fields must be escaped before interpolation.
  return `<!doctype html><html lang="en" data-design="desktop"${theme ? ` data-theme="${theme}"` : ""}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · MCP Observatory</title><link rel="stylesheet" href="/ui/clearframe.css"></head><body><a class="cf-button obs-skip" href="#main">Skip to content</a><header class="obs-topbar"><div class="obs-shell"><a class="obs-brand" href="/">ClearFrame · Observatory</a><nav class="cf-row" aria-label="Observatory navigation">${navigation}</nav></div></header><main id="main" class="obs-shell">${content}</main></body></html>`;
}
