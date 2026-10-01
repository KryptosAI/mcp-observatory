import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { diffArtifacts, renderHtml, validateRunArtifact } from '../src/index.js';

// Reproducible synthetic fixtures only. No targets are started and no account is used.
const directory = path.resolve('dashboard/guide/samples');
await mkdir(directory, { recursive: true });
const fixtures = await Promise.all(['a', 'b'].map(async id => validateRunArtifact(JSON.parse(await readFile(`tests/fixtures/sample-run-${id}.json`, 'utf8')))));
for (const [index, artifact] of fixtures.entries()) {
  artifact.target.targetId = 'sample-invoice-server';
  artifact.target.serverName = 'Sample invoice MCP';
  artifact.target.metadata = { purpose: 'synthetic-guide-example' };
  artifact.toolVersion = '1.49.0';
  await writeFile(path.join(directory, index ? 'head.json' : 'base.json'), JSON.stringify(artifact, null, 2) + '\n');
}
const diff = diffArtifacts(fixtures[0]!, fixtures[1]!);
diff.createdAt = fixtures[1]!.createdAt;
for (const [name, report] of [['scan', fixtures[1]!], ['diff', diff]] as const) {
  // Keep the site's CSP: report styles are separate assets, not inline exceptions.
  let html = renderHtml(report).replace("</head>", '<meta name="theme-color" content="#f9fbfc"></head>');
  let index = 0;
  const styles: string[] = [];
  html = html.replace("<head>", '<head><link rel="stylesheet" href="/m3.css">');
  html = html.replace(/<style>([\s\S]*?)<\/style>/g, (_match, css: string) => {
    styles.push(css); return `<link rel="stylesheet" href="${name}-${index++}.css">`;
  });
  let inlineIndex = 0;
  html = html.replace(/<([a-z][a-z0-9]*)([^>]*?)\sstyle="([^"]*)"([^>]*?)>/gi, (_match, tag: string, before: string, css: string, after: string) => {
    const className = `sample-style-${inlineIndex++}`;
    styles[0] += `\n.${className}{${css}}`;
    let attrs = before + after;
    attrs = /class="/.test(attrs) ? attrs.replace('class="', `class="${className} `) : attrs + ` class="${className}"`;
    return `<${tag}${attrs}>`;
  });
  for (const [i, css] of styles.entries()) await writeFile(path.join(directory, `${name}-${i}.css`), css + '\n.sample-banner{padding:12px 24px;background:#e6f2f5;color:#173d4d;font:600 15px/1.5 system-ui}.sample-banner a{color:inherit}');
  html = html.replace('<body>', '<body><aside class="sample-banner">SAMPLE DATA · Fictional MCP run, rendered by Observatory. <a href="/guide/">Back to the guide</a></aside><main>').replace("</body>", "</main></body>").replace(/<h3\b/g, "<h2").replaceAll("</h3>", "</h2>");
  await writeFile(path.join(directory, `${name}.html`), html);
}
