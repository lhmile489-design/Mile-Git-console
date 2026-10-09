// 提交历史 IPC handlers
import { ipcMain } from 'electron'
import {
  ok,
  fail,
  IPC_BAD_PAYLOAD,
  type IpcResponse,
  type CommitLogResult,
  type CommitDetail,
  type DiffResult
} from '../types/ipc'
import { getCommitLog, getCommitDetail, getCommitFileDiff } from '../git'
import { gitFail } from './git'

export function registerLogIpc(): void {
  ipcMain.handle(
    'git:log:list',
    async (
      _e,
      payload: {
        repoPath: string
        branch?: string
        limit?: number
        offset?: number
        filePath?: string
      }
    ): Promise<IpcResponse<CommitLogResult>> => {
      try {
        if (!payload?.repoPath) return fail(IPC_BAD_PAYLOAD, '缺少 repoPath')
        return ok(await getCommitLog(payload.repoPath, payload))
      } catch (err) {
        return gitFail(err)
      }
    }
  )

  ipcMain.handle(
    'git:log:detail',
    async (
      _e,
      payload: { repoPath: string; hash: string }
    ): Promise<IpcResponse<CommitDetail>> => {
      try {
        if (!payload?.repoPath || !payload.hash) {
          return fail(IPC_BAD_PAYLOAD, '缺少 repoPath 或 hash')
        }
        return ok(await getCommitDetail(payload.repoPath, payload.hash))
      } catch (err) {
        return gitFail(err)
      }
    }
  )

  // 查看某提交中单个文件的 diff（History 视图右侧 diff 区使用）
  ipcMain.handle(
    'git:log:fileDiff',
    async (
      _e,
      payload: { repoPath: string; hash: string; filePath: string }
    ): Promise<IpcResponse<DiffResult>> => {
      try {
        if (!payload?.repoPath || !payload.hash || !payload.filePath) {
          return fail(IPC_BAD_PAYLOAD, '缺少 repoPath、hash 或 filePath')
        }
        return ok(
          await getCommitFileDiff(
            payload.repoPath,
            payload.hash,
            payload.filePath
          )
        )
      } catch (err) {
        return gitFail(err)
      }
    }
  )
}
