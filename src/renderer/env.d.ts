import type { IpcResponse } from '../../preload/index'

// Vite 静态资源：PNG / JPG / SVG 等图片模块，import 后得到资源 URL 字符串
declare module '*.png' {
  const src: string
  export default src
}
declare module '*.jpg' {
  const src: string
  export default src
}
declare module '*.svg' {
  const src: string
  export default src
}

declare global {
  interface Window {
    electronAPI: {
      invoke: <T = unknown>(channel: string, ...args: unknown[]) => Promise<IpcResponse<T>>
      on: (channel: string, listener: (...args: unknown[]) => void) => void
      off: (channel: string, listener: (...args: unknown[]) => void) => void
    }
  }
}
