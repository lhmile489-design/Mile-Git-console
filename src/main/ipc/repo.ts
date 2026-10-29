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
import {
  listRepos,
  addRepo,
  removeRepo,
  touchRepo,
  getRepoByPath,
  relocateRepo,
  updateRepoMeta
} from '../storage/db'
import { isGitRepo } from '../git'

export function registerRepoIpc(): void {
  ipcMain.handle('repo:list', async (): Promise<IpcResponse<RepoItem[]>> => {
    try {
      // 每次列出时检查目录是否还在，失效仓库在界面上单独标注
      return ok(listRepos().map((r) => (isGitRepo(r.path) ? r : { ...r, missing: true })))
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
    'repo:relocate',
    async (_e, payload: { id: number; path: string }): Promise<IpcResponse<RepoItem>> => {
      try {
        if (typeof payload?.id !== 'number' || !payload.path || typeof payload.path !== 'string') {
          return fail(IPC_BAD_PAYLOAD, '缺少仓库 id 或路径')
        }
        if (!fs.existsSync(payload.path) || !isGitRepo(payload.path)) {
          return fail(
            IPC_NOT_A_REPO,
            `该文件夹不是有效的 Git 仓库（未找到 .git）：${path.basename(payload.path)}`
          )
        }
        const other = getRepoByPath(payload.path)
        if (other && other.id !== payload.id) {
          return fail(IPC_BAD_PAYLOAD, `该路径已在列表中：${other.name}`)
        }
        const updated = relocateRepo(payload.id, payload.path)
        if (!updated) return fail(IPC_BAD_PAYLOAD, '仓库不存在')
        return ok(updated)
      } catch (err) {
        return fail(IPC_STORAGE_FAILED, String(err))
      }
    }
  )

  // 别名 / 备注 / 所属工作区；payload 里没出现的字段保持不变，传 null 表示清空
  ipcMain.handle(
    'repo:updateMeta',
    async (
      _e,
      payload: {
        id: number
        alias?: string | null
        note?: string | null
        workspaceId?: number | null
      }
    ): Promise<IpcResponse<RepoItem>> => {
      try {
        if (typeof payload?.id !== 'number') return fail(IPC_BAD_PAYLOAD, '缺少仓库 id')
        const isText = (v: unknown): boolean => v === null || typeof v === 'string'
        if ('alias' in payload && !isText(payload.alias)) return fail(IPC_BAD_PAYLOAD, '别名格式错误')
        if ('note' in payload && !isText(payload.note)) return fail(IPC_BAD_PAYLOAD, '备注格式错误')
        if (
          'workspaceId' in payload &&
          payload.workspaceId !== null &&
          typeof payload.workspaceId !== 'number'
        ) {
          return fail(IPC_BAD_PAYLOAD, '工作区 id 格式错误')
        }
        const { id, ...meta } = payload
        const updated = updateRepoMeta(id, meta)
        return updated ? ok(updated) : fail(IPC_BAD_PAYLOAD, '仓库不存在')
      } catch (err) {
        return fail(IPC_BAD_PAYLOAD, err instanceof Error ? err.message : String(err))
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
