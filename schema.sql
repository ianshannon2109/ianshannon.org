-- Leads captured by the capstone report form.
-- Apply with:
--   npx wrangler d1 execute ianshannon-leads --remote --file schema.sql

CREATE TABLE IF NOT EXISTS leads (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  source     TEXT,              -- 'capstone' | 'quiz'
  ip_hash    TEXT,              -- salted hash, for rate limiting only
  user_agent TEXT
);

-- Rate limiting reads by ip_hash within a time window on every submission.
CREATE INDEX IF NOT EXISTS idx_leads_ip_time ON leads (ip_hash, created_at);
