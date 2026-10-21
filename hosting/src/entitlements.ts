export type ProductPlan = "free" | "individual";
export type UsageKind = "uploads" | "hosted_scans";

export interface ProductLimits {
  targets: number;
  uploadsPerMonth: number;
  hostedScansPerMonth: number;
  retentionDays: number;
  history: boolean;
  ciIngestion: boolean;
  artifactDownload: boolean;
}

export interface EntitlementSnapshot {
  plan: ProductPlan;
  subscriptionStatus: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  graceUntil: string | null;
  freeTargetId: string | null;
  limits: ProductLimits;
  usage: {
    month: string;
    uploads: number;
    hostedScans: number;
  };
  permissions: {
    canUpload: boolean;
    canHostedScan: boolean;
    canViewHistory: boolean;
    canDownloadArtifacts: boolean;
    readOnly: boolean;
  };
}

export interface AccessDecision {
  allowed: boolean;
  code?: "subscription_required" | "quota_exceeded";
  message?: string;
}

const FREE_LIMITS: ProductLimits = {
  targets: 1000, uploadsPerMonth: 10000, hostedScansPerMonth: 100,
  retentionDays: 90, history: true, ciIngestion: true, artifactDownload: true,
};

export function usageMonth(now = new Date()): string { return now.toISOString().slice(0, 7); }

export function entitlementFromRecord(record: { uploads?: number | null; hosted_scans?: number | null } | null, now = new Date()): EntitlementSnapshot {
  const uploads = Math.max(0, Number(record?.uploads ?? 0));
  const hostedScans = Math.max(0, Number(record?.hosted_scans ?? 0));
  return {
    plan: "free", subscriptionStatus: "none", currentPeriodEnd: null,
    cancelAtPeriodEnd: false, graceUntil: null, freeTargetId: null,
    limits: { ...FREE_LIMITS }, usage: { month: usageMonth(now), uploads, hostedScans },
    permissions: { canUpload: uploads < FREE_LIMITS.uploadsPerMonth,
      canHostedScan: hostedScans < FREE_LIMITS.hostedScansPerMonth,
      canViewHistory: true, canDownloadArtifacts: true, readOnly: false },
  };
}

export function decideUpload(entitlement: EntitlementSnapshot, options: { isCi: boolean; targetAlreadyExists: boolean; targetCount: number; isSelectedTarget?: boolean }): AccessDecision {
  if (!options.targetAlreadyExists && options.targetCount >= entitlement.limits.targets) return { allowed: false, code: "quota_exceeded", message: "Hosted target capacity reached. Local scans remain unlimited." };
  if (!entitlement.permissions.canUpload) return { allowed: false, code: "quota_exceeded", message: "Hosted upload capacity reached. Local scans remain unlimited." };
  return { allowed: true };
}

export function decideHostedScan(entitlement: EntitlementSnapshot): AccessDecision {
  return entitlement.permissions.canHostedScan ? { allowed: true } : { allowed: false, code: "quota_exceeded", message: "Hosted scan capacity reached. Local scans remain unlimited." };
}

export async function getEntitlement(db: D1Database, userId: number, now = new Date()): Promise<EntitlementSnapshot> {
  const month = usageMonth(now);
  const row = await db.prepare(`
    SELECT e.plan, e.subscription_status, e.current_period_end, e.cancel_at_period_end, e.grace_until,
           COALESCE((
             SELECT e.free_target_id
             WHERE e.free_target_id IS NOT NULL AND EXISTS (
               SELECT 1 FROM server_scans AS selected_scan
               WHERE selected_scan.user_id = users.id
                 AND selected_scan.target_id = e.free_target_id
                 AND (selected_scan.retention_deadline IS NULL OR datetime(selected_scan.retention_deadline) > datetime('now'))
             )
           ), (
             SELECT server_scans.target_id FROM server_scans
             WHERE server_scans.user_id = users.id
               AND (server_scans.retention_deadline IS NULL OR datetime(server_scans.retention_deadline) > datetime('now'))
             ORDER BY server_scans.scanned_at DESC, server_scans.id DESC LIMIT 1
           )) AS free_target_id,
           COALESCE(u.uploads, 0) AS uploads,
           COALESCE(u.hosted_scans, 0) AS hosted_scans
    FROM users
    LEFT JOIN entitlements e ON e.user_id = users.id
    LEFT JOIN monthly_usage u ON u.user_id = users.id AND u.month = ?
    WHERE users.id = ?
  `).bind(month, userId).first<{
    plan?: string;
    subscription_status?: string;
    current_period_end?: string;
    cancel_at_period_end?: number;
    grace_until?: string;
    free_target_id?: string;
    uploads?: number;
    hosted_scans?: number;
  }>();
  return entitlementFromRecord(row, now);
}

export async function ensureEntitlement(db: D1Database, userId: number): Promise<void> {
  await db.prepare("INSERT OR IGNORE INTO entitlements (user_id) VALUES (?)").bind(userId).run();
}

export async function reserveUsage(
  db: D1Database,
  userId: number,
  kind: UsageKind,
  limit: number,
  now = new Date(),
): Promise<boolean> {
  if (limit <= 0) return false;
  const column = kind === "uploads" ? "uploads" : "hosted_scans";
  const result = await db.prepare(`
    INSERT INTO monthly_usage (user_id, month, ${column}, updated_at)
    VALUES (?, ?, 1, datetime('now'))
    ON CONFLICT(user_id, month) DO UPDATE SET
      ${column} = ${column} + 1,
      updated_at = datetime('now')
    WHERE ${column} < ?
  `).bind(userId, usageMonth(now), limit).run();
  return Number(result.meta.changes ?? 0) > 0;
}

export async function reserveTarget(
  db: D1Database,
  userId: number,
  targetId: string,
  limit: number,
  freeTargetId: string | null = null,
): Promise<boolean> {
  if (limit <= 0) return false;
  if (limit === 1) {
    if (freeTargetId && freeTargetId !== targetId) return false;
    const selected = await db.prepare(`
      UPDATE entitlements SET free_target_id = ?, updated_at = datetime('now')
      WHERE user_id = ? AND (
        free_target_id IS NULL OR free_target_id = ? OR (
          EXISTS (
            SELECT 1 FROM server_scans AS prior_scan
            WHERE prior_scan.user_id = entitlements.user_id
              AND prior_scan.target_id = entitlements.free_target_id
          ) AND NOT EXISTS (
            SELECT 1 FROM server_scans AS active_scan
            WHERE active_scan.user_id = entitlements.user_id
              AND active_scan.target_id = entitlements.free_target_id
              AND (active_scan.retention_deadline IS NULL OR datetime(active_scan.retention_deadline) > datetime('now'))
          )
        )
      )
    `).bind(targetId, userId, targetId).run();
    if (Number(selected.meta.changes ?? 0) === 0) return false;
    const target = await db.prepare(`
      INSERT INTO account_targets (user_id, target_id, first_seen_at, last_seen_at)
      VALUES (?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(user_id, target_id) DO UPDATE SET last_seen_at = datetime('now')
    `).bind(userId, targetId).run();
    return Number(target.meta.changes ?? 0) > 0;
  }
  const result = await db.prepare(`
    INSERT INTO account_targets (user_id, target_id, first_seen_at, last_seen_at)
    SELECT ?, ?, datetime('now'), datetime('now')
    WHERE EXISTS (
      SELECT 1 FROM account_targets WHERE user_id = ? AND target_id = ?
    ) OR (
      SELECT COUNT(*) FROM account_targets WHERE user_id = ?
    ) < ?
    ON CONFLICT(user_id, target_id) DO UPDATE SET last_seen_at = datetime('now')
  `).bind(userId, targetId, userId, targetId, userId, limit).run();
  return Number(result.meta.changes ?? 0) > 0;
}

export async function refreshFreeTarget(db: D1Database, userId: number): Promise<void> {
  await db.prepare(`
    UPDATE entitlements SET free_target_id = (
      SELECT server_scans.target_id FROM server_scans
      WHERE server_scans.user_id = entitlements.user_id
        AND (server_scans.retention_deadline IS NULL OR datetime(server_scans.retention_deadline) > datetime('now'))
      ORDER BY datetime(server_scans.scanned_at) DESC, server_scans.id DESC
      LIMIT 1
    ), updated_at = datetime('now')
    WHERE user_id = ?
  `).bind(userId).run();
}

export function retentionDeadline(days: number, now = new Date()): string {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1_000).toISOString();
}

export async function recordProductEvent(
  db: D1Database,
  userId: number | null,
  eventName: string,
  options: {
    eventId?: string;
    targetId?: string;
    source?: "cloud" | "public_site";
    isFirstParty?: boolean;
    isFixture?: boolean;
  } = {},
): Promise<boolean> {
  const result = await db.prepare(`
    INSERT OR IGNORE INTO product_events (
      user_id, event_name, source, is_first_party, is_fixture, event_id, target_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      userId,
      eventName,
      options.source ?? "cloud",
      options.isFirstParty ? 1 : 0,
      options.isFixture ? 1 : 0,
      options.eventId ?? null,
      options.targetId ?? null,
    )
    .run();
  // Some compatible D1 adapters do not populate mutation metadata. The event
  // was still accepted; only the duplicate/no-op distinction is unavailable.
  return result.meta?.changes === undefined || Number(result.meta.changes) > 0;
}

/** All hosted Observatory features are free; capacity protects deployment resources. */
export const getObservatoryEntitlement = getEntitlement;
