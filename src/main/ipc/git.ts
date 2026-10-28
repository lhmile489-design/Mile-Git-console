// Git 工作区 IPC handlers（status/stage/unstage/discard/commit/diff）
import { ipcMain } from 'electron'
import {
  ok,
  fail,
  IPC_GIT_FAILED,
  IPC_REMOTE_FAILED,
  IPC_MERGE_CONFLICT,
  IPC_CANCELLED,
  IPC_BAD_PAYLOAD,
  IPC_UNKNOWN,
  type IpcResponse,
  type GitStatus,
  type DiffResult
} from '../types/ipc'
import {
  GitError,
  getStatus,
  stageFiles,
  unstageFiles,
  discardFiles,
  commit,
  getDiff
} from '../git'
import { logOperation } from '../storage/db'

function gitFail<T = never>(err: unknown): IpcResponse<T> {
  if (err instanceof GitError) {
    const code =
      err.kind === 'remote'
        ? IPC_REMOTE_FAILED
        : err.kind === 'conflict'
          ? IPC_MERGE_CONFLICT
          : err.kind === 'cancelled'
            ? IPC_CANCELLED
            : IPC_GIT_FAILED
    return fail(code, err.message)
  }
  return fail(IPC_UNKNOWN, String(err))
}

export { gitFail }

export function registerGitIpc(): void {
  ipcMain.handle(
    'git:status',
    async (_e, payload: { repoPath: string }): Promise<IpcResponse<GitStatus>> => {
      try {
        if (!payload?.repoPath) return fail(IPC_BAD_PAYLOAD, '缺少 repoPath')
        return ok(await getStatus(payload.repoPath))
      } catch (err) {
        return gitFail(err)
      }
    }
  )

  ipcMain.handle(
    'git:stage',
    async (
      _e,
      payload: { repoPath: string; filePaths: string[] }
    ): Promise<IpcResponse<null>> => {
      try {
        if (!payload?.repoPath || !Array.isArray(payload.filePaths)) {
          return fail(IPC_BAD_PAYLOAD, '缺少 repoPath 或 filePaths')
        }
        await stageFiles(payload.repoPath, payload.filePaths)
        return ok(null)
      } catch (err) {
        return gitFail(err)
      }
    }
  )

  ipcMain.handle(
    'git:unstage',
    async (
      _e,
      payload: { repoPath: string; filePaths: string[] }
    ): Promise<IpcResponse<null>> => {
      try {
        if (!payload?.repoPath || !Array.isArray(payload.filePaths)) {
          return fail(IPC_BAD_PAYLOAD, '缺少 repoPath 或 filePaths')
        }
        await unstageFiles(payload.repoPath, payload.filePaths)
        return ok(null)
      } catch (err) {
        return gitFail(err)
      }
    }
  )

  // 危险操作：UI 层必须二次确认后才调用
  ipcMain.handle(
    'git:discard',
    async (
      _e,
      payload: { repoPath: string; filePaths: string[] }
    ): Promise<IpcResponse<null>> => {
      try {
        if (!payload?.repoPath || !Array.isArray(payload.filePaths)) {
          return fail(IPC_BAD_PAYLOAD, '缺少 repoPath 或 filePaths')
        }
        await discardFiles(payload.repoPath, payload.filePaths)
        logOperation(payload.repoPath, 'discard', 'success', {
          files: payload.filePaths
        })
        return ok(null)
      } catch (err) {
        logOperation(payload?.repoPath ?? '', 'discard', 'failed', undefined, String(err))
        return gitFail(err)
      }
    }
  )

  ipcMain.handle(
    'git:commit',
    async (
      _e,
      payload: { repoPath: string; message: string; description?: string }
    ): Promise<IpcResponse<{ commitHash: string }>> => {
      try {
        if (!payload?.repoPath || !payload.message?.trim()) {
          return fail(IPC_BAD_PAYLOAD, '缺少 repoPath 或提交信息为空')
        }
        const result = await commit(
          payload.repoPath,
          payload.message.trim(),
          payload.description?.trim() || undefined
        )
        logOperation(payload.repoPath, 'commit', 'success', {
          message: payload.message.trim(),
          commitHash: result.commitHash
        })
        return ok(result)
      } catch (err) {
        logOperation(payload?.repoPath ?? '', 'commit', 'failed', undefined, String(err))
        return gitFail(err)
      }
    }
  )

  ipcMain.handle(
    'git:diff',
    async (
      _e,
      payload: { repoPath: string; filePath: string; staged?: boolean }
    ): Promise<IpcResponse<DiffResult>> => {
      try {
        if (!payload?.repoPath || !payload.filePath) {
          return fail(IPC_BAD_PAYLOAD, '缺少 repoPath 或 filePath')
        }
        return ok(
          await getDiff(payload.repoPath, payload.filePath, !!payload.staged)
        )
      } catch (err) {
        return gitFail(err)
      }
    }
  )
}
