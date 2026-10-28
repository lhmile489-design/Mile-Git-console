// 渲染进程 IPC 调用辅助函数（单一来源）
// api/git.ts / api/repo.ts / api/settings.ts 统一从此处 import，不再各自定义。

import type { IpcResponse } from '../types/ipc'

// 带错误码的 IPC 错误：调用方据此区分「用户取消」「合并冲突」等非普通失败
export class IpcError extends Error {
  constructor(
    message: string,
    public readonly code: number
  ) {
    super(message)
    this.name = 'IpcError'
  }
}

export async function invoke<T>(channel: string, payload?: unknown): Promise<T> {
  const res: IpcResponse<T> = await window.electronAPI.invoke<T>(channel, payload)
  if (res.code !== 0) throw new IpcError(res.msg, res.code)
  return res.data as T
}
