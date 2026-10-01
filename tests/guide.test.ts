import { readFileSync, existsSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { guideTopics } from '../scripts/guide-page.js';
import { validateRunArtifact, validateDiffArtifact, diffArtifacts } from '../src/index.js';

describe('published guide evidence and coverage', () => {
  it('covers every registered user command, including recording aliases', () => {
    const commands = new Set(guideTopics.flatMap(topic => topic.commands.map(command => command.split(' ')[0])));
    for (const command of ['scan','source-audit','toxic-flow','package-check','test','demo','diff','record','replay','verify','watch','serve','suggest','telemetry','usage','score','badge','history','ci-report','enterprise-report','init-ci','setup-ci','lock','audit','enforce','receipt','risk-graph','attack-sim','skill-scan','wrap','protect','cloud','smithery','help']) {
      expect(commands.has(command), `${command} needs a guide workflow`).toBe(true);
    }
    for (const topic of guideTopics) {
      expect(existsSync(`docs/${topic.doc}`), topic.doc).toBe(true);
      if (topic.image) expect(existsSync(`dashboard/guide/images/${topic.image}.jpg`)).toBe(true);
    }
  });
  it('offers valid synthetic receipts that actually reproduce the illustrated regression', () => {
    const read = (name: string) => validateRunArtifact(JSON.parse(readFileSync(`dashboard/guide/samples/${name}.json`, 'utf8')));
    const base = read('base'), head = read('head');
    expect(base.gate).toBe('pass'); expect(head.gate).toBe('fail');
    expect(head.target.metadata?.purpose).toBe('synthetic-guide-example');
    const diff = validateDiffArtifact(diffArtifacts(base, head));
    expect(diff.regressions.map(r => r.id)).toContain('tools');
    for (const name of ['scan','diff']) {
      const html = readFileSync(`dashboard/guide/samples/${name}.html`, 'utf8');
      expect(html).toContain('SAMPLE DATA');
      expect(html).not.toMatch(/<style\b|\sstyle="|<script\b/);
      expect(html).toContain('<main>');
    }
  });
});
