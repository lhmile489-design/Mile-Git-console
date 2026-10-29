// SQLite 初始化与迁移（better-sqlite3 同步 API，仅主进程使用）
import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import Database from 'better-sqlite3'
import type { RepoItem, OperationType } from '../types/ipc'

const DB_PATH = path.join(app.getPath('userData'), 'mile-git-management.db')

let db: Database.Database | null = null

export function initDatabase(): Database.Database {
  if (db) return db
  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // 迁移记录表（内部表，不属于迁移脚本）
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )
  `)

  runMigrations(db)
  return db
}

function runMigrations(database: Database.Database): void {
  const migrationDir = path.join(__dirname, 'migrations')
  if (!fs.existsSync(migrationDir)) return
  const files = fs
    .readdirSync(migrationDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    const version = parseInt(file.split('_')[0], 10)
    if (Number.isNaN(version)) continue
    const alreadyApplied = database
      .prepare('SELECT 1 FROM schema_migrations WHERE version = ?')
      .get(version)
    if (alreadyApplied) continue

    const sql = fs.readFileSync(path.join(migrationDir, file), 'utf-8')
    // 脚本与版本记录放在同一事务：任一步失败整体回滚，不会停在半迁移状态
    const apply = database.transaction(() => {
      database.exec(sql)
      database
        .prepare(
          'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)'
        )
        .run(version, file, new Date().toISOString())
    })
    apply()
    console.log(`[DB] Applied migration: ${file}`)
  }
}

function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized')
  return db
}

// ---------------------------------------------------------------- repositories
interface RepoRow {
  id: number
  name: string
  path: string
  added_at: string
  last_opened_at: string
}

function rowToRepo(row: RepoRow): RepoItem {
  return {
    id: row.id,
    name: row.name,
    path: row.path,
    addedAt: row.added_at,
    lastOpenedAt: row.last_opened_at
  }
}

export function listRepos(): RepoItem[] {
  const rows = getDb()
    .prepare('SELECT * FROM repositories ORDER BY last_opened_at DESC')
    .all() as RepoRow[]
  return rows.map(rowToRepo)
}

export function getRepoByPath(repoPath: string): RepoItem | null {
  const row = getDb()
    .prepare('SELECT * FROM repositories WHERE path = ?')
    .get(repoPath) as RepoRow | undefined
  return row ? rowToRepo(row) : null
}

export function addRepo(repoPath: string): RepoItem {
  const existing = getRepoByPath(repoPath)
  if (existing) return existing
  const now = new Date().toISOString()
  const name = path.basename(repoPath)
  const result = getDb()
    .prepare(
      'INSERT INTO repositories (name, path, added_at, last_opened_at) VALUES (?, ?, ?, ?)'
    )
    .run(name, repoPath, now, now)
  return {
    id: Number(result.lastInsertRowid),
    name,
    path: repoPath,
    addedAt: now,
    lastOpenedAt: now
  }
}

export function removeRepo(id: number): void {
  getDb().prepare('DELETE FROM operation_logs WHERE repo_id = ?').run(id)
  getDb().prepare('DELETE FROM repositories WHERE id = ?').run(id)
}

// 重新定位：仓库目录被移走后指向新路径，名称随新目录名更新；操作日志保留
export function relocateRepo(id: number, repoPath: string): RepoItem | null {
  const name = path.basename(repoPath)
  getDb().prepare('UPDATE repositories SET path = ?, name = ? WHERE id = ?').run(repoPath, name, id)
  const row = getDb().prepare('SELECT * FROM repositories WHERE id = ?').get(id) as RepoRow | undefined
  return row ? rowToRepo(row) : null
}

export function touchRepo(id: number): void {
  getDb()
    .prepare('UPDATE repositories SET last_opened_at = ? WHERE id = ?')
    .run(new Date().toISOString(), id)
}

// ---------------------------------------------------------------- operation_logs
export function logOperation(
  repoPath: string,
  operation: OperationType,
  status: 'success' | 'failed' | 'cancelled',
  detail?: Record<string, unknown>,
  errorMsg?: string
): void {
  try {
    const repo = getRepoByPath(repoPath)
    if (!repo) return
    getDb()
      .prepare(
        `INSERT INTO operation_logs (repo_id, operation, status, detail, error_msg, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        repo.id,
        operation,
        status,
        detail ? JSON.stringify(detail) : null,
        errorMsg ?? null,
        new Date().toISOString()
      )
  } catch (err) {
    // 日志失败不影响主流程
    console.error('[DB] logOperation failed:', err)
  }
}
