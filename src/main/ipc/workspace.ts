// 工作区（仓库分类）IPC handlers
import { ipcMain } from 'electron'
import {
  ok,
  fail,
  IPC_BAD_PAYLOAD,
  IPC_STORAGE_FAILED,
  type IpcResponse,
  type WorkspaceItem
} from '../types/ipc'
import {
  listWorkspaces,
  createWorkspace,
  renameWorkspace,
  setWorkspaceCollapsed,
  deleteWorkspace
} from '../storage/db'

export function registerWorkspaceIpc(): void {
  ipcMain.handle('workspace:list', async (): Promise<IpcResponse<WorkspaceItem[]>> => {
    try {
      return ok(listWorkspaces())
    } catch (err) {
      return fail(IPC_STORAGE_FAILED, String(err))
    }
  })

  ipcMain.handle(
    'workspace:create',
    async (_e, payload: { name: string }): Promise<IpcResponse<WorkspaceItem>> => {
      try {
        if (typeof payload?.name !== 'string') return fail(IPC_BAD_PAYLOAD, '缺少工作区名称')
        return ok(createWorkspace(payload.name))
      } catch (err) {
        return fail(IPC_BAD_PAYLOAD, err instanceof Error ? err.message : String(err))
      }
    }
  )

  ipcMain.handle(
    'workspace:rename',
    async (_e, payload: { id: number; name: string }): Promise<IpcResponse<WorkspaceItem>> => {
      try {
        if (typeof payload?.id !== 'number' || typeof payload.name !== 'string') {
          return fail(IPC_BAD_PAYLOAD, '缺少工作区 id 或名称')
        }
        const updated = renameWorkspace(payload.id, payload.name)
        return updated ? ok(updated) : fail(IPC_BAD_PAYLOAD, '工作区不存在')
      } catch (err) {
        return fail(IPC_BAD_PAYLOAD, err instanceof Error ? err.message : String(err))
      }
    }
  )

  ipcMain.handle(
    'workspace:setCollapsed',
    async (_e, payload: { id: number; collapsed: boolean }): Promise<IpcResponse<null>> => {
      try {
        if (typeof payload?.id !== 'number' || typeof payload.collapsed !== 'boolean') {
          return fail(IPC_BAD_PAYLOAD, '缺少工作区 id 或折叠状态')
        }
        setWorkspaceCollapsed(payload.id, payload.collapsed)
        return ok(null)
      } catch (err) {
        return fail(IPC_STORAGE_FAILED, String(err))
      }
    }
  )

  // 删除工作区：仓库回到未分组，不删除仓库记录
  ipcMain.handle(
    'workspace:delete',
    async (_e, payload: { id: number }): Promise<IpcResponse<null>> => {
      try {
        if (typeof payload?.id !== 'number') return fail(IPC_BAD_PAYLOAD, '缺少工作区 id')
        deleteWorkspace(payload.id)
        return ok(null)
      } catch (err) {
        return fail(IPC_STORAGE_FAILED, String(err))
      }
    }
  )
}
