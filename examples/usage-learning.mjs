// Run after npm run build: node examples/usage-learning.mjs <output-directory>
// Synthetic fixture only; no network or real customer conversations.
import assert from 'node:assert/strict';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { z } from 'zod';
import { UsageStore, observeTool, analyzeUsage, exportUsageRegression, verifyUsageRegression, writeUsageOutput } from '../dist/src/index.js';

const directory = process.argv[2];
if (!directory) throw new Error('Pass an output directory for synthetic usage evidence');
const store = new UsageStore(path.join(directory, 'events'));
const server = new McpServer({ name: 'usage-learning-fixture', version: '1.0.0' });
server.registerTool('find_invoices', { inputSchema: { overdue: z.boolean() } },
  observeTool({ store, server: 'billing-fixture', tool: 'find_invoices', argumentKeys: ['overdue'], captureResult: true },
    () => Promise.resolve({ content: [{ type: 'text', text: 'All invoices' }] })));
const client = new Client({ name: 'synthetic-client', version: '1.0.0' });
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
await server.connect(serverTransport);
await client.connect(clientTransport);
try {
  await client.callTool({ name: 'find_invoices', arguments: { overdue: true } });
  const calls = (await store.read()).filter(e => e.kind === 'call');
  const report = await store.report({
    callIds: [calls.at(-1).id], asked: 'Find overdue invoices', expected: 'Only overdue invoices', got: 'All invoices',
    outcome: 'failure', provenance: 'user_written',
    consent: { optedIn: true, userReviewed: true, reviewedAt: new Date().toISOString(), policyVersion: 'synthetic-demo-v1' },
    excerpt: [{ role: 'user', text: 'No, I meant overdue invoices', provenance: 'user_text' }],
  });
  await store.report({
    callIds: [], asked: 'Find overdue invoices please', expected: 'Overdue invoices', got: 'All invoices',
    outcome: 'failure', provenance: 'user_written', consent: report.consent, excerpt: [],
  });
  await store.report({
    callIds: [], asked: 'Schedule a calendar meeting', expected: 'A meeting', got: 'A meeting',
    outcome: 'success', provenance: 'user_written', consent: report.consent, excerpt: [],
  });
  const events = await store.read();
  const analysis = await analyzeUsage(events);
  assert.equal(analysis.clusters[0].count, 2);
  const regression = exportUsageRegression(events, report.id);
  const assertOutcome = result => assert.equal(result, 'Only overdue invoices');
  await assert.rejects(verifyUsageRegression({ args: regression.cases[0].args,
    invoke: () => Promise.resolve('All invoices'), assertOutcome }));
  await verifyUsageRegression({ args: { overdue: true },
    invoke: args => Promise.resolve(args.overdue ? 'Only overdue invoices' : 'All invoices'), assertOutcome });
  await writeUsageOutput(path.join(directory, 'analysis.json'), analysis);
  await writeUsageOutput(path.join(directory, 'regression.json'), regression);
  console.log('Verified real MCP call → reviewed report → excerpt → intent cluster → failing/passing regression.');
} finally {
  await client.close();
  await server.close();
}
