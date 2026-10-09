// 分支管理 IPC handlers
import { ipcMain } from 'electron'
import {
  ok,
  fail,
  IPC_BAD_PAYLOAD,
  type IpcResponse,
  type BranchInfo
} from '../types/ipc'
import {
  listBranches,
  createBranch,
  switchBranch,
  mergeBranch,
  deleteBranch
} from '../git'
import { logOperation } from '../storage/db'
import { gitFail } from './git'

export function registerBranchIpc(): void {
  ipcMain.handle(
    'git:branch:list',
    async (
      _e,
      payload: { repoPath: string }
    ): Promise<IpcResponse<BranchInfo[]>> => {
      try {
        if (!payload?.repoPath) return fail(IPC_BAD_PAYLOAD, '缺少 repoPath')
        return ok(await listBranches(payload.repoPath))
      } catch (err) {
        return gitFail(err)
      }
    }
  )

  ipcMain.handle(
    'git:branch:create',
    async (
      _e,
      payload: { repoPath: string; branchName: string; fromBranch?: string }
    ): Promise<IpcResponse<null>> => {
      try {
        if (!payload?.repoPath || !payload.branchName?.trim()) {
          return fail(IPC_BAD_PAYLOAD, '缺少 repoPath 或 branchName')
        }
        await createBranch(
          payload.repoPath,
          payload.branchName.trim(),
          payload.fromBranch
        )
        logOperation(payload.repoPath, 'branch_create', 'success', {
          branch: payload.branchName.trim(),
          from: payload.fromBranch ?? null
        })
        return ok(null)
      } catch (err) {
        return gitFail(err)
      }
    }
  )

  ipcMain.handle(
    'git:branch:switch',
    async (
      _e,
      payload: { repoPath: string; branchName: string }
    ): Promise<IpcResponse<null>> => {
      try {
        if (!payload?.repoPath || !payload.branchName) {
          return fail(IPC_BAD_PAYLOAD, '缺少 repoPath 或 branchName')
        }
        await switchBranch(payload.repoPath, payload.branchName)
        logOperation(payload.repoPath, 'branch_switch', 'success', {
          to: payload.branchName
        })
        return ok(null)
      } catch (err) {
        logOperation(payload?.repoPath ?? '', 'branch_switch', 'failed', undefined, String(err))
        return gitFail(err)
      }
    }
  )

  ipcMain.handle(
    'git:branch:merge',
    async (
      _e,
      payload: { repoPath: string; sourceBranch: string }
    ): Promise<IpcResponse<{ hasConflict: boolean }>> => {
      try {
        if (!payload?.repoPath || !payload.sourceBranch) {
          return fail(IPC_BAD_PAYLOAD, '缺少 repoPath 或 sourceBranch')
        }
        const result = await mergeBranch(payload.repoPath, payload.sourceBranch)
        logOperation(
          payload.repoPath,
          'merge',
          result.hasConflict ? 'failed' : 'success',
          { source: payload.sourceBranch, hasConflict: result.hasConflict }
        )
        return ok(result)
      } catch (err) {
        return gitFail(err)
      }
    }
  )

  // 危险操作：force=true 相当于 -D，UI 层必须二次确认
  ipcMain.handle(
    'git:branch:delete',
    async (
      _e,
      payload: { repoPath: string; branchName: string; force?: boolean }
    ): Promise<IpcResponse<null>> => {
      try {
        if (!payload?.repoPath || !payload.branchName) {
          return fail(IPC_BAD_PAYLOAD, '缺少 repoPath 或 branchName')
        }
        await deleteBranch(payload.repoPath, payload.branchName, !!payload.force)
        logOperation(payload.repoPath, 'branch_delete', 'success', {
          branch: payload.branchName,
          force: !!payload.force
        })
        return ok(null)
      } catch (err) {
        return gitFail(err)
      }
    }
  )
}
