// 主进程与渲染进程共享的 IPC 类型定义
// 该文件是唯一来源（SoT），两端均从此处 import，不再各自维护副本。
// 主进程专有类型（OperationType 等）见 src/main/types/ipc.ts
// 渲染进程专有类型（UI 状态类型等）见 src/renderer/src/types/ipc.ts

// ---- 通用响应体 ----
export interface IpcResponse<T = unknown> {
  code: number
  msg: string
  data: T | null
}

// ---- 仓库管理 ----
export interface RepoItem {
  id: number
  name: string
  path: string
  addedAt: string
  lastOpenedAt: string
}

// ---- Git 工作区 ----
export type GitFileStatusType =
  | 'added'
  | 'modified'
  | 'deleted'
  | 'renamed'
  | 'untracked'
  | 'conflict'

export interface GitFileStatus {
  path: string
  status: GitFileStatusType
  staged: boolean
  oldPath?: string
}

export interface GitStatus {
  branch: string
  ahead: number
  behind: number
  hasRemote: boolean
  files: GitFileStatus[]
}

// ---- Diff ----
export interface DiffLine {
  type: 'context' | 'added' | 'removed'
  content: string
  oldLineNo?: number
  newLineNo?: number
}

export interface DiffHunk {
  header: string
  lines: DiffLine[]
}

export interface DiffResult {
  filePath: string
  hunks: DiffHunk[]
  isBinary: boolean
}

// ---- 分支管理 ----
export interface BranchInfo {
  name: string
  isCurrent: boolean
  isRemote: boolean
  lastCommitHash: string
  lastCommitMessage: string
  lastCommitDate: string
}

// ---- 提交历史 ----
export interface CommitEntry {
  hash: string
  shortHash: string
  message: string
  description?: string
  author: string
  email: string
  date: string
  changedFiles: number
  additions: number
  deletions: number
  tags?: string[]
}

export interface CommitLogResult {
  commits: CommitEntry[]
  total: number
  hasMore: boolean
}

export interface CommitFileChange {
  path: string
  status: 'added' | 'modified' | 'deleted' | 'renamed'
  additions: number
  deletions: number
  oldPath?: string
}

export interface CommitDetail extends CommitEntry {
  files: CommitFileChange[]
}

// ---- 错误码常量 ----
export const IPC_OK = 0
export const IPC_GIT_FAILED = 1001
export const IPC_REPO_NOT_FOUND = 1002
export const IPC_NOT_A_REPO = 1003
export const IPC_REMOTE_FAILED = 1004
export const IPC_MERGE_CONFLICT = 1005
export const IPC_CANCELLED = 1006
export const IPC_STORAGE_FAILED = 2001
export const IPC_BAD_PAYLOAD = 2002
export const IPC_UNKNOWN = 9001

// ---- 辅助函数 ----
export function ok<T>(data: T): IpcResponse<T> {
  return { code: IPC_OK, msg: 'ok', data }
}

export function fail<T = never>(code: number, msg: string): IpcResponse<T> {
  return { code, msg, data: null }
}
