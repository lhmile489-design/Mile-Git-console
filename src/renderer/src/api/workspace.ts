// 工作区（仓库分类）API 封装
import type { WorkspaceItem } from '../types/ipc'
import { invoke } from './_invoke'

export const listWorkspaces = (): Promise<WorkspaceItem[]> => invoke('workspace:list')

export const createWorkspace = (name: string): Promise<WorkspaceItem> =>
  invoke('workspace:create', { name })

export const renameWorkspace = (id: number, name: string): Promise<WorkspaceItem> =>
  invoke('workspace:rename', { id, name })

export const setWorkspaceCollapsed = (id: number, collapsed: boolean): Promise<null> =>
  invoke('workspace:setCollapsed', { id, collapsed })

// 删除工作区后，其中的仓库回到「未分组」
export const deleteWorkspace = (id: number): Promise<null> => invoke('workspace:delete', { id })
