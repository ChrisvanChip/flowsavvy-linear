CREATE TABLE linear_issue_sync (
  issue_id TEXT PRIMARY KEY,
  delivery_id TEXT NOT NULL,
  event_timestamp INTEGER NOT NULL
);
