// 渲染进程 IPC 类型定义
// 公共类型（响应体、仓库、Git 状态、Diff、分支、历史、错误码）来自 shared，不在此处重复定义。
// 本文件只保留渲染进程专有的 UI 状态类型，并重新导出 shared 的内容方便渲染进程代码统一从此处 import。

export * from '../../../shared/types/ipc'

// ---- 渲染进程专有：应用设置 ----
export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  language: 'zh-CN' | 'en'
  commitMessageTemplate: string
  defaultRemote: string
}

// ---- 渲染进程专有：UI 视图状态 ----
export type MainView = 'changes' | 'history'

export interface SelectedFile {
  path: string
  staged: boolean
}

export interface SelectedCommitFile {
  hash: string
  path: string
}
