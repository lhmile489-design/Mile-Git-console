// 渲染进程 IPC 调用辅助函数（单一来源）
// api/git.ts / api/repo.ts / api/settings.ts 统一从此处 import，不再各自定义。

import type { IpcResponse } from '../types/ipc'

export async function invoke<T>(channel: string, payload?: unknown): Promise<T> {
  const res: IpcResponse<T> = await window.electronAPI.invoke<T>(channel, payload)
  if (res.code !== 0) throw new Error(res.msg)
  return res.data as T
}
