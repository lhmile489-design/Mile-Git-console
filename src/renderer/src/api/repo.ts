// 仓库管理 API 封装（渲染进程视角的接口层）
import type { RepoItem } from '../types/ipc'
import { invoke } from './_invoke'

export const listRepos = (): Promise<RepoItem[]> => invoke('repo:list')

export const addRepo = (path: string): Promise<RepoItem> =>
  invoke('repo:add', { path })

export const removeRepo = (id: number): Promise<null> =>
  invoke('repo:remove', { id })

export const touchRepo = (id: number): Promise<null> =>
  invoke('repo:touch', { id })

export const openFolderDialog = (): Promise<{ path: string } | null> =>
  invoke('dialog:open-folder')
