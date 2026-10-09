// 远端操作 IPC handlers（fetch/pull/push）
import { ipcMain } from 'electron'
import {
  ok,
  fail,
  IPC_BAD_PAYLOAD,
  type IpcResponse
} from '../types/ipc'
import { fetchRemote, pullRemote, pushRemote } from '../git'
import { logOperation } from '../storage/db'
import { gitFail } from './git'
import { getSetting } from './settings'

export function registerRemoteIpc(): void {
  ipcMain.handle(
    'git:remote:fetch',
    async (_e, payload: { repoPath: string }): Promise<IpcResponse<null>> => {
      try {
        if (!payload?.repoPath) return fail(IPC_BAD_PAYLOAD, '缺少 repoPath')
        await fetchRemote(payload.repoPath)
        logOperation(payload.repoPath, 'fetch', 'success')
        return ok(null)
      } catch (err) {
        logOperation(payload?.repoPath ?? '', 'fetch', 'failed', undefined, String(err))
        return gitFail(err)
      }
    }
  )

  ipcMain.handle(
    'git:remote:pull',
    async (
      _e,
      payload: { repoPath: string }
    ): Promise<IpcResponse<{ hasConflict: boolean }>> => {
      try {
        if (!payload?.repoPath) return fail(IPC_BAD_PAYLOAD, '缺少 repoPath')
        const result = await pullRemote(payload.repoPath)
        logOperation(
          payload.repoPath,
          'pull',
          result.hasConflict ? 'failed' : 'success',
          { hasConflict: result.hasConflict }
        )
        return ok(result)
      } catch (err) {
        logOperation(payload?.repoPath ?? '', 'pull', 'failed', undefined, String(err))
        return gitFail(err)
      }
    }
  )

  // force=true 危险操作，UI 层必须二次确认
  ipcMain.handle(
    'git:remote:push',
    async (
      _e,
      payload: { repoPath: string; force?: boolean; setUpstream?: boolean }
    ): Promise<IpcResponse<null>> => {
      try {
        if (!payload?.repoPath) return fail(IPC_BAD_PAYLOAD, '缺少 repoPath')
        const remote = await getSetting('defaultRemote')
        await pushRemote(payload.repoPath, {
          force: !!payload.force,
          setUpstream: !!payload.setUpstream,
          remote: typeof remote === 'string' ? remote : 'origin'
        })
        logOperation(payload.repoPath, 'push', 'success', {
          force: !!payload.force,
          setUpstream: !!payload.setUpstream
        })
        return ok(null)
      } catch (err) {
        logOperation(payload?.repoPath ?? '', 'push', 'failed', undefined, String(err))
        return gitFail(err)
      }
    }
  )
}
