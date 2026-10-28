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

// 仓库目录被移走后指向新路径
export const relocateRepo = (id: number, path: string): Promise<RepoItem> =>
  invoke('repo:relocate', { id, path })

export const openFolderDialog = (): Promise<{ path: string } | null> =>
  invoke('dialog:open-folder')
