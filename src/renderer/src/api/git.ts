// Git 操作 API 封装
import type {
  GitStatus,
  DiffResult,
  BranchInfo,
  CommitLogResult,
  CommitDetail
} from '../types/ipc'
import { invoke } from './_invoke'

// ---- 工作区 ----
export const getGitStatus = (repoPath: string): Promise<GitStatus> =>
  invoke('git:status', { repoPath })

export const stageFiles = (
  repoPath: string,
  filePaths: string[]
): Promise<null> => invoke('git:stage', { repoPath, filePaths })

export const unstageFiles = (
  repoPath: string,
  filePaths: string[]
): Promise<null> => invoke('git:unstage', { repoPath, filePaths })

// 危险操作：调用前 UI 层必须弹二次确认
export const discardFiles = (
  repoPath: string,
  filePaths: string[]
): Promise<null> => invoke('git:discard', { repoPath, filePaths })

export const commitChanges = (
  repoPath: string,
  message: string,
  description?: string
): Promise<{ commitHash: string }> =>
  invoke('git:commit', { repoPath, message, description })

export const getFileDiff = (
  repoPath: string,
  filePath: string,
  staged = false
): Promise<DiffResult> => invoke('git:diff', { repoPath, filePath, staged })

// ---- 分支 ----
export const listBranches = (repoPath: string): Promise<BranchInfo[]> =>
  invoke('git:branch:list', { repoPath })

export const createBranch = (
  repoPath: string,
  branchName: string,
  fromBranch?: string
): Promise<null> =>
  invoke('git:branch:create', { repoPath, branchName, fromBranch })

export const switchBranch = (
  repoPath: string,
  branchName: string
): Promise<null> => invoke('git:branch:switch', { repoPath, branchName })

export const mergeBranch = (
  repoPath: string,
  sourceBranch: string
): Promise<{ hasConflict: boolean }> =>
  invoke('git:branch:merge', { repoPath, sourceBranch })

// 危险操作：force=true 时 UI 层必须额外提示
export const deleteBranch = (
  repoPath: string,
  branchName: string,
  force = false
): Promise<null> => invoke('git:branch:delete', { repoPath, branchName, force })

// ---- 远端 ----
export const fetchRemote = (repoPath: string): Promise<null> =>
  invoke('git:remote:fetch', { repoPath })

export const pullRemote = (
  repoPath: string
): Promise<{ hasConflict: boolean }> => invoke('git:remote:pull', { repoPath })

// 危险操作：force=true 时 UI 层必须弹二次确认
export const pushRemote = (
  repoPath: string,
  force = false,
  setUpstream = false
): Promise<null> =>
  invoke('git:remote:push', { repoPath, force, setUpstream })

// ---- 提交历史 ----
export const getCommitLog = (
  repoPath: string,
  options: {
    branch?: string
    limit?: number
    offset?: number
    filePath?: string
  } = {}
): Promise<CommitLogResult> => invoke('git:log:list', { repoPath, ...options })

export const getCommitDetail = (
  repoPath: string,
  hash: string
): Promise<CommitDetail> => invoke('git:log:detail', { repoPath, hash })

export const getCommitFileDiff = (
  repoPath: string,
  hash: string,
  filePath: string
): Promise<DiffResult> =>
  invoke('git:log:fileDiff', { repoPath, hash, filePath })

// ---- 窗口控制（自定义标题栏）----
export const windowMinimize = (): Promise<null> => invoke('window:minimize')
export const windowMaximize = (): Promise<null> => invoke('window:maximize')
export const windowClose = (): Promise<null> => invoke('window:close')
