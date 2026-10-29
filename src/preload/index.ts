import { contextBridge, ipcRenderer, webUtils } from 'electron'

// 统一响应类型
export interface IpcResponse<T = unknown> {
  code: number
  msg: string
  data: T | null
}

/**
 * 允许渲染进程监听的主进程推送事件白名单。
 * 仅列于此处的 channel 才可通过 on() 监听，防止恶意脚本监听内部事件。
 */
const ALLOWED_LISTEN_CHANNELS: ReadonlySet<string> = new Set([
  'git:progress',  // Git 操作进度推送（fetch/push/pull 长耗时操作）
  'app:update'     // 应用更新通知（预留）
])

/**
 * 允许渲染进程通过 invoke() 调用的 IPC channel 白名单。
 * 任何不在此列表中的 channel 调用都会被拒绝。
 */
const ALLOWED_INVOKE_CHANNELS: ReadonlySet<string> = new Set([
  'repo:list',
  'repo:add',
  'repo:remove',
  'repo:touch',
  'repo:relocate',
  'repo:updateMeta',
  'workspace:list',
  'workspace:create',
  'workspace:rename',
  'workspace:setCollapsed',
  'workspace:delete',
  'dialog:open-folder',
  'git:status',
  'git:stage',
  'git:unstage',
  'git:discard',
  'git:commit',
  'git:diff',
  'git:branch:list',
  'git:branch:create',
  'git:branch:switch',
  'git:branch:merge',
  'git:branch:delete',
  'git:remote:fetch',
  'git:remote:pull',
  'git:remote:push',
  'git:remote:cancel',
  'git:log:list',
  'git:log:detail',
  'git:log:fileDiff',
  'settings:get',
  'settings:set',
  'window:minimize',
  'window:maximize',
  'window:close',
  'window:material',
  'shell:openExternal'
])

// 暴露给渲染进程的 API（通过 contextBridge，渲染进程通过 window.electronAPI 访问）
const api = {
  /**
   * 通用 IPC 调用入口
   * channel 格式：'模块:动作'，如 'git:status'、'repo:list'
   * 只允许调用白名单中的 channel，其他请求会被拒绝。
   */
  invoke: <T = unknown>(channel: string, ...args: unknown[]): Promise<IpcResponse<T>> => {
    if (!ALLOWED_INVOKE_CHANNELS.has(channel)) {
      return Promise.resolve({
        code: 9001,
        msg: `不允许调用的 IPC channel：${channel}`,
        data: null
      })
    }
    return ipcRenderer.invoke(channel, ...args)
  },

  /**
   * 监听主进程推送的事件（如 Git 操作进度），只允许白名单中的 channel。
   * 返回取消订阅函数：包装后的监听器只存在于 preload 内部，
   * 渲染进程无法用原函数调用 removeListener，所以必须由这里闭包持有。
   */
  /**
   * 取拖入文件（夹）的本地路径。Electron 32 起 File.path 已移除，只能经 webUtils 获取
   */
  getPathForFile: (file: File): string => webUtils.getPathForFile(file),

  on: (channel: string, listener: (...args: unknown[]) => void): (() => void) => {
    if (!ALLOWED_LISTEN_CHANNELS.has(channel)) {
      console.warn(`[preload] 不允许监听的 IPC channel：${channel}`)
      return () => undefined
    }
    const wrapped = (_event: unknown, ...args: unknown[]): void => listener(...args)
    ipcRenderer.on(channel, wrapped)
    return () => {
      ipcRenderer.removeListener(channel, wrapped)
    }
  }
}

// contextBridge 暴露（仅在 Electron 上下文中生效）
// 只暴露 electronAPI：不再暴露 @electron-toolkit 的 electronAPI，它自带完整 ipcRenderer，会绕过上面的白名单
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', api)
  } catch (error) {
    console.error('contextBridge 暴露失败:', error)
  }
} else {
  // @ts-ignore（非隔离环境的开发调试回退）
  window.electronAPI = api
}
