// 仓库管理 IPC handlers
import { ipcMain, dialog, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import {
  ok,
  fail,
  IPC_NOT_A_REPO,
  IPC_BAD_PAYLOAD,
  IPC_STORAGE_FAILED,
  IPC_UNKNOWN,
  type IpcResponse,
  type RepoItem
} from '../types/ipc'
import { listRepos, addRepo, removeRepo, touchRepo } from '../storage/db'
import { isGitRepo } from '../git'

export function registerRepoIpc(): void {
  ipcMain.handle('repo:list', async (): Promise<IpcResponse<RepoItem[]>> => {
    try {
      return ok(listRepos())
    } catch (err) {
      return fail(IPC_STORAGE_FAILED, String(err))
    }
  })

  ipcMain.handle(
    'repo:add',
    async (_e, payload: { path: string }): Promise<IpcResponse<RepoItem>> => {
      try {
        const repoPath = payload?.path
        if (!repoPath || typeof repoPath !== 'string') {
          return fail(IPC_BAD_PAYLOAD, '缺少仓库路径')
        }
        if (!fs.existsSync(repoPath)) {
          return fail(IPC_NOT_A_REPO, `路径不存在：${repoPath}`)
        }
        if (!isGitRepo(repoPath)) {
          return fail(
            IPC_NOT_A_REPO,
            `该文件夹不是有效的 Git 仓库（未找到 .git）：${path.basename(repoPath)}`
          )
        }
        // 已存在则返回已有记录
        return ok(addRepo(repoPath))
      } catch (err) {
        return fail(IPC_UNKNOWN, String(err))
      }
    }
  )

  ipcMain.handle(
    'repo:remove',
    async (_e, payload: { id: number }): Promise<IpcResponse<null>> => {
      try {
        if (typeof payload?.id !== 'number') {
          return fail(IPC_BAD_PAYLOAD, '缺少仓库 id')
        }
        removeRepo(payload.id)
        return ok(null)
      } catch (err) {
        return fail(IPC_STORAGE_FAILED, String(err))
      }
    }
  )

  ipcMain.handle(
    'repo:touch',
    async (_e, payload: { id: number }): Promise<IpcResponse<null>> => {
      try {
        if (typeof payload?.id !== 'number') {
          return fail(IPC_BAD_PAYLOAD, '缺少仓库 id')
        }
        touchRepo(payload.id)
        return ok(null)
      } catch (err) {
        return fail(IPC_STORAGE_FAILED, String(err))
      }
    }
  )

  ipcMain.handle(
    'dialog:open-folder',
    async (e): Promise<IpcResponse<{ path: string } | null>> => {
      try {
        const win = BrowserWindow.fromWebContents(e.sender)
        const result = await dialog.showOpenDialog(win!, {
          title: '选择 Git 仓库文件夹',
          properties: ['openDirectory']
        })
        if (result.canceled || result.filePaths.length === 0) {
          return ok(null)
        }
        return ok({ path: result.filePaths[0] })
      } catch (err) {
        return fail(IPC_UNKNOWN, String(err))
      }
    }
  )
}
