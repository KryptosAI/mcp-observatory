-- Fresh MIT-hosted Observatory schema. No billing or ClearFrame tables.

CREATE TABLE account_targets (
  user_id INTEGER NOT NULL,
  target_id TEXT NOT NULL,
  first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, target_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE device_codes (
  device_code TEXT PRIMARY KEY,
  user_code TEXT NOT NULL UNIQUE,
  user_id INTEGER,
  approved_at TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE entitlements (
  user_id INTEGER PRIMARY KEY,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'individual')),
  subscription_status TEXT NOT NULL DEFAULT 'none',
  current_period_end TEXT,
  grace_until TEXT,
  free_target_id TEXT,
  stripe_event_created INTEGER NOT NULL DEFAULT 0,
  stripe_event_priority INTEGER NOT NULL DEFAULT 0,
  stripe_event_id TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')), cancel_at_period_end INTEGER NOT NULL DEFAULT 0 CHECK (cancel_at_period_end IN (0, 1)),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE monthly_usage (
  user_id INTEGER NOT NULL,
  month TEXT NOT NULL,
  uploads INTEGER NOT NULL DEFAULT 0,
  hosted_scans INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, month),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE orgs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain TEXT NOT NULL UNIQUE,
  github_org TEXT,
  stripe_customer_id TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE product_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  event_name TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'cloud',
  is_first_party INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE server_scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL,
  run_id TEXT NOT NULL UNIQUE,
  target_id TEXT NOT NULL,
  server_name TEXT,
  gate TEXT NOT NULL,
  health_score INTEGER NOT NULL DEFAULT 0,
  health_grade TEXT NOT NULL DEFAULT 'F',
  scanned_at TEXT NOT NULL,
  artifact_key TEXT
, user_id INTEGER, retention_deadline TEXT, source TEXT NOT NULL DEFAULT 'upload', is_ci INTEGER NOT NULL DEFAULT 0, is_regression INTEGER NOT NULL DEFAULT 0);



CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  github_id TEXT NOT NULL UNIQUE,
  github_login TEXT NOT NULL,
  email TEXT,
  org_domains TEXT,
  org_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
, stripe_customer_id TEXT);

CREATE INDEX idx_product_events_user_created
  ON product_events(user_id, created_at DESC);

CREATE INDEX idx_server_scans_org_scanned ON server_scans(org_id, scanned_at DESC);

CREATE INDEX idx_server_scans_retention
  ON server_scans(retention_deadline);

CREATE INDEX idx_server_scans_target_scanned ON server_scans(org_id, target_id, scanned_at DESC);

CREATE INDEX idx_server_scans_user_scanned
  ON server_scans(user_id, scanned_at DESC);

CREATE INDEX idx_users_org_id ON users(org_id);

CREATE VIEW independent_product_funnel AS
SELECT event_name, COUNT(*) AS events, COUNT(DISTINCT user_id) AS users
FROM product_events
WHERE is_first_party = 0
GROUP BY event_name;

ALTER TABLE product_events ADD COLUMN event_id TEXT;
ALTER TABLE product_events ADD COLUMN target_id TEXT;
ALTER TABLE product_events ADD COLUMN is_fixture INTEGER NOT NULL DEFAULT 0 CHECK (is_fixture IN (0, 1));
CREATE UNIQUE INDEX idx_product_events_event_id ON product_events(event_id) WHERE event_id IS NOT NULL;
