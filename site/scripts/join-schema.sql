-- D1 database levni-join, bound to the Pages project as JOIN_DB.
CREATE TABLE IF NOT EXISTS crew (
  email TEXT PRIMARY KEY,
  name TEXT,
  link TEXT,
  roles TEXT,
  source TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  unsubscribed_at TEXT
);
