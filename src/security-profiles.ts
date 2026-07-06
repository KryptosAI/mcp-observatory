export type SecurityProfileId = "nsa-mcp";

export type SecurityControlArea =
  | "trust_boundaries"
  | "tool_permissions"
  | "tool_description_integrity"
  | "authentication"
  | "secrets_exposure"
  | "schema_validation"
  | "input_validation"
  | "auditability"
  | "runtime_safety"
  | "supply_chain";

export interface SecurityProfile {
  id: SecurityProfileId;
  title: string;
  description: string;
  disclaimer: string;
  controlAreas: SecurityControlArea[];
  ruleControls: Record<string, SecurityControlArea[]>;
  categoryControls: Record<string, SecurityControlArea[]>;
}

const NSA_MCP_PROFILE: SecurityProfile = {
  id: "nsa-mcp",
  title: "NSA-MCP Public Guidance Profile",
  description: "Operationalizes public security guidance into practical MCP release-gate checks for sensitive, regulated, or mission-critical agentic AI environments.",
  disclaimer: "This profile is not an official NSA certification, endorsement, or compliance authorization.",
  controlAreas: [
    "trust_boundaries",
    "tool_permissions",
    "tool_description_integrity",
    "authentication",
    "secrets_exposure",
    "schema_validation",
    "input_validation",
    "auditability",
    "runtime_safety",
    "supply_chain",
  ],
  ruleControls: {
    "mcp-observatory/security/no-auth-http": ["authentication", "trust_boundaries"],
    "mcp-observatory/security/shell-injection": ["tool_permissions", "runtime_safety", "input_validation"],
    "mcp-observatory/security/broad-filesystem": ["tool_permissions", "trust_boundaries"],
    "mcp-observatory/security/permissive-schema": ["schema_validation", "input_validation"],
    "mcp-observatory/security/credential-pattern": ["secrets_exposure", "auditability"],
    "mcp-observatory/attack-sim/tool-poisoning/hidden-instruction": ["tool_description_integrity", "trust_boundaries"],
    "mcp-observatory/attack-sim/tool-poisoning/exfiltration-language": ["tool_description_integrity", "secrets_exposure"],
    "mcp-observatory/attack-sim/tool-poisoning/autonomy-escalation": ["tool_description_integrity", "runtime_safety"],
    "mcp-observatory/attack-sim/permission-boundary/broad-destructive-tool": ["tool_permissions", "runtime_safety", "trust_boundaries"],
    "mcp-observatory/attack-sim/exfiltration-canary/canary-exposed": ["secrets_exposure", "auditability"],
    "mcp-observatory/attack-sim/exfiltration-canary/credential-like-output": ["secrets_exposure", "auditability"],
    "mcp-observatory/attack-sim/contract-drift/new-destructive-tool": ["supply_chain", "tool_permissions"],
    "mcp-observatory/attack-sim/contract-drift/required-fields-removed": ["supply_chain", "schema_validation"],
    "mcp-observatory/attack-sim/contract-drift/schema-broadened": ["supply_chain", "schema_validation"],
    "mcp-observatory/schema-quality/schema-diagnostic": ["schema_validation", "input_validation"],
    "mcp-observatory/run/fatal-error": ["runtime_safety", "auditability"],
  },
  categoryControls: {
    "security": ["tool_permissions", "runtime_safety"],
    "security-lite": ["tool_permissions", "runtime_safety"],
    "attack-sim": ["trust_boundaries", "tool_permissions"],
    "schema-quality": ["schema_validation", "input_validation"],
    "conformance": ["runtime_safety"],
    "tools": ["runtime_safety"],
    "tools-invoke": ["runtime_safety", "auditability"],
  },
};

const PROFILES: Record<SecurityProfileId, SecurityProfile> = {
  "nsa-mcp": NSA_MCP_PROFILE,
};

export function loadSecurityProfile(id: string): SecurityProfile {
  const profile = PROFILES[id as SecurityProfileId];
  if (!profile) {
    throw new Error(`Unknown security profile "${id}". Available profiles: ${Object.keys(PROFILES).join(", ")}`);
  }
  return profile;
}

export function availableSecurityProfiles(): SecurityProfile[] {
  return Object.values(PROFILES);
}
