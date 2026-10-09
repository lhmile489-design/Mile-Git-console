-- 初始化建表（幂等，使用 IF NOT EXISTS）
CREATE TABLE IF NOT EXISTS repositories (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT    NOT NULL,
  path            TEXT    NOT NULL UNIQUE,
  added_at        TEXT    NOT NULL,
  last_opened_at  TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_repositories_path ON repositories(path);

CREATE TABLE IF NOT EXISTS operation_logs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id      INTEGER NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  operation    TEXT    NOT NULL,
  status       TEXT    NOT NULL,
  detail       TEXT,
  error_msg    TEXT,
  created_at   TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_operation_logs_repo ON operation_logs(repo_id, created_at DESC);

-- 验证 SQL：确认两张表已创建
SELECT name FROM sqlite_master WHERE type='table' AND name IN ('repositories', 'operation_logs');
