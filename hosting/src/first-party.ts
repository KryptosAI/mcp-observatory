// Who counts as the house.
//
// `FIRST_PARTY_GITHUB_IDS` and `FIRST_PARTY_GITHUB_LOGINS` already exist in the deployed
// configuration, and until now they were read in exactly one place: the product-event recorder,
// where the flag only decides how an analytics row is attributed.
//
// That is the wrong scope for the flag. The owner's own account is not a customer account, and a
// metering rule written for customers should not be applied to it. The clearance is the same
// question — "is this the house?" — so it is answered once, here, and asked wherever the answer
// changes a decision.
//
// Both identifiers are accepted because either can be missing: a login can be renamed, and a
// numeric id cannot. Matching a login alone would silently stop working the first time the account
// is renamed; matching the id alone would stop working if the row predates the id being stored.
// Either match is enough, and neither is inferred.
export type FirstPartyIdentity = { github_id?: string | number | null; github_login?: string | null };

/** Split a comma-separated configuration value into a comparable set. Empty entries are dropped. */
export function configuredValues(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * Whether an identity is the house, according to the deployment's configuration.
 *
 * Pure, so a test can state the rule without a database.
 */
export function isFirstPartyIdentity(env: { FIRST_PARTY_GITHUB_IDS?: string; FIRST_PARTY_GITHUB_LOGINS?: string }, identity: FirstPartyIdentity | null | undefined): boolean {
  const ids = configuredValues(env.FIRST_PARTY_GITHUB_IDS);
  const logins = configuredValues(env.FIRST_PARTY_GITHUB_LOGINS);
  // An unconfigured deployment has no first party, rather than every account being one. The
  // guards matter: `String(null)` is "null", and a configuration of "null" would otherwise match.
  if (ids.size === 0 && logins.size === 0) return false;
  const id = identity?.github_id === null || identity?.github_id === undefined ? "" : String(identity.github_id).trim().toLowerCase();
  const login = typeof identity?.github_login === "string" ? identity.github_login.trim().toLowerCase() : "";
  return (id !== "" && ids.has(id)) || (login !== "" && logins.has(login));
}

/**
 * The same question, answered for a stored user.
 *
 * Returns false when there is no database or no row: an account that cannot be identified is a
 * customer account, which is the safe direction for a rule that grants rather than denies.
 */
export async function isFirstPartyUser(env: { DB?: D1Database; FIRST_PARTY_GITHUB_IDS?: string; FIRST_PARTY_GITHUB_LOGINS?: string }, userId: number): Promise<boolean> {
  if (!env.DB) return false;
  const identity = await env.DB.prepare("SELECT github_id, github_login FROM users WHERE id = ?")
    .bind(userId)
    .first<FirstPartyIdentity>();
  return isFirstPartyIdentity(env, identity);
}
