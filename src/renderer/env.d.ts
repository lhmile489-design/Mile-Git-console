import type { IpcResponse } from '../../preload/index'

// 图片模块声明见 assets.d.ts（本文件含 import，属于模块文件，不能放通配模块声明）

declare global {
  interface Window {
    electronAPI: {
      invoke: <T = unknown>(channel: string, ...args: unknown[]) => Promise<IpcResponse<T>>
      on: (channel: string, listener: (...args: unknown[]) => void) => void
      off: (channel: string, listener: (...args: unknown[]) => void) => void
    }
  }
}
