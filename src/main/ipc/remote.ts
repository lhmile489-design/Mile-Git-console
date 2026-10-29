// 远端操作 IPC handlers（fetch/pull/push/cancel）
// 每个仓库同一时间只允许一个远端操作；进度通过 git:progress 推送，取消通过 AbortController
import { ipcMain, type WebContents } from 'electron'
import type { SimpleGitProgressEvent } from 'simple-git'
import {
  ok,
  fail,
  IPC_BAD_PAYLOAD,
  IPC_CANCELLED,
  IPC_REMOTE_BUSY,
  type IpcResponse
} from '../types/ipc'
import { fetchRemote, pullRemote, pushRemote, GitError } from '../git'
import { logOperation } from '../storage/db'
import { gitFail } from './git'
import { getSetting } from './settings'

type RemoteOp = 'fetch' | 'pull' | 'push'

// 正在进行的远端操作：repoPath -> 控制器
const running = new Map<string, AbortController>()

function progressSender(sender: WebContents, repoPath: string, op: RemoteOp) {
  let lastSent = 0
  return (e: SimpleGitProgressEvent): void => {
    // 节流：同一阶段最多每 100ms 推一次，终点（100）一定推
    const now = Date.now()
    if (e.progress < 100 && now - lastSent < 100) return
    lastSent = now
    if (sender.isDestroyed()) return
    sender.send('git:progress', { repoPath, op, stage: e.stage, progress: e.progress })
  }
}

// 统一的运行外壳：登记控制器、执行、记录日志、清理
async function runRemote<T>(
  sender: WebContents,
  repoPath: string,
  op: RemoteOp,
  detail: Record<string, unknown> | undefined,
  exec: (run: { signal: AbortSignal; onProgress: (e: SimpleGitProgressEvent) => void }) => Promise<T>
): Promise<IpcResponse<T>> {
  if (running.has(repoPath)) {
    return fail(IPC_REMOTE_BUSY, '该仓库已有远端操作正在进行')
  }
  const controller = new AbortController()
  running.set(repoPath, controller)
  try {
    const result = await exec({
      signal: controller.signal,
      onProgress: progressSender(sender, repoPath, op)
    })
    logOperation(repoPath, op, 'success', detail)
    return ok(result)
  } catch (err) {
    if (err instanceof GitError && err.kind === 'cancelled') {
      logOperation(repoPath, op, 'cancelled', detail)
      return fail(IPC_CANCELLED, '已取消')
    }
    logOperation(repoPath, op, 'failed', undefined, String(err))
    return gitFail(err)
  } finally {
    running.delete(repoPath)
  }
}

export function registerRemoteIpc(): void {
  ipcMain.handle(
    'git:remote:fetch',
    async (e, payload: { repoPath: string }): Promise<IpcResponse<null>> => {
      if (!payload?.repoPath) return fail(IPC_BAD_PAYLOAD, '缺少 repoPath')
      return runRemote(e.sender, payload.repoPath, 'fetch', undefined, async (run) => {
        await fetchRemote(payload.repoPath, run)
        return null
      })
    }
  )

  ipcMain.handle(
    'git:remote:pull',
    async (
      e,
      payload: { repoPath: string }
    ): Promise<IpcResponse<{ hasConflict: boolean }>> => {
      if (!payload?.repoPath) return fail(IPC_BAD_PAYLOAD, '缺少 repoPath')
      return runRemote(e.sender, payload.repoPath, 'pull', undefined, async (run) => {
        const result = await pullRemote(payload.repoPath, run)
        return result
      })
    }
  )

  // force=true 危险操作，UI 层必须二次确认
  ipcMain.handle(
    'git:remote:push',
    async (
      e,
      payload: { repoPath: string; force?: boolean; setUpstream?: boolean }
    ): Promise<IpcResponse<null>> => {
      if (!payload?.repoPath) return fail(IPC_BAD_PAYLOAD, '缺少 repoPath')
      const remote = await getSetting('defaultRemote')
      const detail = { force: !!payload.force, setUpstream: !!payload.setUpstream }
      return runRemote(e.sender, payload.repoPath, 'push', detail, async (run) => {
        await pushRemote(
          payload.repoPath,
          {
            force: !!payload.force,
            setUpstream: !!payload.setUpstream,
            remote: typeof remote === 'string' ? remote : 'origin'
          },
          run
        )
        return null
      })
    }
  )

  // 取消当前仓库正在进行的远端操作；没有进行中的操作也算成功
  ipcMain.handle(
    'git:remote:cancel',
    async (_e, payload: { repoPath: string }): Promise<IpcResponse<null>> => {
      if (!payload?.repoPath) return fail(IPC_BAD_PAYLOAD, '缺少 repoPath')
      running.get(payload.repoPath)?.abort()
      return ok(null)
    }
  )
}
