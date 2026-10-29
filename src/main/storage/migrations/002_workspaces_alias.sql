-- 工作区分类 + 仓库别名 / 备注
-- 注意：SQLite 的 ADD COLUMN 不支持 IF NOT EXISTS，不能脱离迁移记录单独重跑。
-- 重复执行由 schema_migrations 版本号拦截；脚本与版本记录在同一事务内，失败会整体回滚。

CREATE TABLE IF NOT EXISTS workspaces (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  collapsed   INTEGER NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL
);

ALTER TABLE repositories ADD COLUMN alias TEXT;
ALTER TABLE repositories ADD COLUMN note TEXT;
-- 工作区被删除时仓库回到「未分组」，不删除仓库记录
ALTER TABLE repositories ADD COLUMN workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_repositories_workspace ON repositories(workspace_id);

-- 验证 SQL：确认新表与新列已创建
SELECT name FROM sqlite_master WHERE type='table' AND name = 'workspaces';
SELECT name FROM pragma_table_info('repositories') WHERE name IN ('alias', 'note', 'workspace_id');
