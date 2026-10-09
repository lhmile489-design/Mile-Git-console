// 主进程 IPC 类型定义
// 公共类型（响应体、仓库、Git 状态、Diff、分支、历史、错误码）来自 shared，不在此处重复定义。
// 本文件只保留主进程专有类型，并重新导出 shared 的内容方便主进程代码统一从此处 import。

export * from '../../shared/types/ipc'

// ---- 主进程专有：操作日志类型 ----
export type OperationType =
  | 'commit'
  | 'push'
  | 'pull'
  | 'fetch'
  | 'merge'
  | 'branch_create'
  | 'branch_switch'
  | 'branch_delete'
  | 'discard'
