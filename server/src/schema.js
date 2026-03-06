const schemaSql = `
CREATE TABLE IF NOT EXISTS month_refs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref_month TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS import_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL CHECK (source IN ('manual', 'system')),
  ref_month TEXT NOT NULL,
  file_name TEXT,
  status TEXT NOT NULL,
  total_valid INTEGER NOT NULL DEFAULT 0,
  total_invalid INTEGER NOT NULL DEFAULT 0,
  duplicates INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS apr_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref_month TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('manual', 'system')),
  apr_id TEXT NOT NULL,
  data_abertura TEXT NOT NULL,
  assunto TEXT NOT NULL,
  colaborador TEXT NOT NULL,
  imported_at TEXT,
  import_batch_id INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (import_batch_id) REFERENCES import_batches(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_apr_records_ref_source_apr
  ON apr_records (ref_month, source, apr_id);
CREATE INDEX IF NOT EXISTS idx_apr_records_ref_month ON apr_records (ref_month);
CREATE INDEX IF NOT EXISTS idx_apr_records_source ON apr_records (source);

CREATE TABLE IF NOT EXISTS manual_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref_month TEXT NOT NULL,
  apr_id TEXT NOT NULL,
  action TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  changed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reason TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS collaborator_catalog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);
`;

export function applyMigrations(db) {
  db.exec(schemaSql);
}
