export interface RiskTaxonomy {
  cwe: string[];
  owasp: string[];
  mitreAttack: string[];
  cvssVector: string;
}

interface TaxonomySource {
  ruleId: string;
  category?: string;
}

export const RULE_TAXONOMY: Record<string, RiskTaxonomy> = {
  "mcp-observatory/security/shell-injection": {
    cwe: ["CWE-78"],
    owasp: ["OWASP Top 10 2021 A03: Injection"],
    mitreAttack: ["T1059"],
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H",
  },
  "mcp-observatory/security/broad-filesystem": {
    cwe: ["CWE-22"],
    owasp: ["OWASP Top 10 2021 A01: Broken Access Control"],
    mitreAttack: ["T1005"],
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
  },
  "mcp-observatory/security/permissive-schema": {
    cwe: ["CWE-20"],
    owasp: ["OWASP API Security Top 10 2023 API8: Security Misconfiguration"],
    mitreAttack: [],
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:L/A:N",
  },
  "mcp-observatory/security/credential-pattern": {
    cwe: ["CWE-200", "CWE-522"],
    owasp: ["OWASP Top 10 2021 A07: Identification and Authentication Failures", "OWASP API Security Top 10 2023 API2: Broken Authentication"],
    mitreAttack: ["T1552"],
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N",
  },
  "mcp-observatory/security/no-auth-http": {
    cwe: ["CWE-306"],
    owasp: ["OWASP API Security Top 10 2023 API1: Broken Object Level Authorization"],
    mitreAttack: [],
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:N",
  },
  "mcp-observatory/attack-sim/permission-boundary/broad-destructive-tool": {
    cwe: ["CWE-732"],
    owasp: ["OWASP Top 10 2021 A01: Broken Access Control"],
    mitreAttack: ["T1059"],
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H",
  },
  "mcp-observatory/attack-sim/exfiltration-canary/canary-exposed": {
    cwe: ["CWE-200"],
    owasp: ["OWASP Top 10 2021 A01: Broken Access Control"],
    mitreAttack: ["T1041"],
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N",
  },
  "mcp-observatory/attack-sim/exfiltration-canary/credential-like-output": {
    cwe: ["CWE-200", "CWE-522"],
    owasp: ["OWASP Top 10 2021 A07: Identification and Authentication Failures"],
    mitreAttack: ["T1552"],
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N",
  },
  "mcp-observatory/attack-sim/contract-drift/schema-broadened": {
    cwe: ["CWE-20"],
    owasp: ["OWASP API Security Top 10 2023 API8: Security Misconfiguration"],
    mitreAttack: [],
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:L/A:N",
  },
  "mcp-observatory/audit/env-secret": {
    cwe: ["CWE-522"],
    owasp: ["OWASP Top 10 2021 A07: Identification and Authentication Failures"],
    mitreAttack: ["T1552"],
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
  },
};

export const CATEGORY_TAXONOMY: Record<string, RiskTaxonomy> = {
  "schema-quality": {
    cwe: ["CWE-20"],
    owasp: ["OWASP API Security Top 10 2023 API8: Security Misconfiguration"],
    mitreAttack: [],
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:N",
  },
  "security-lite": {
    cwe: ["CWE-703"],
    owasp: ["OWASP Top 10 2021 A06: Vulnerable and Outdated Components"],
    mitreAttack: [],
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N",
  },
};

export function taxonomyForRule(ruleId: string, category?: string): RiskTaxonomy | undefined {
  return RULE_TAXONOMY[ruleId] ?? (category ? CATEGORY_TAXONOMY[category] : undefined);
}

export function taxonomyForFinding(source: TaxonomySource): RiskTaxonomy | undefined {
  return taxonomyForRule(source.ruleId, source.category);
}

export function taxonomyTags(taxonomy: RiskTaxonomy | undefined): string[] {
  if (!taxonomy) return [];
  const tags: string[] = [];
  for (const cwe of taxonomy.cwe) tags.push(cwe);
  for (const owasp of taxonomy.owasp) tags.push(owasp);
  for (const attack of taxonomy.mitreAttack) tags.push(attack);
  return tags;
}
