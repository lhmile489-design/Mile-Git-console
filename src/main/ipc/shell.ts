// shell 操作 IPC handler（仅允许 http/https 协议，防止 file:// 等危险跳转）
import { ipcMain, shell } from 'electron'
import { ok, fail, IPC_UNKNOWN, type IpcResponse } from '../types/ipc'

const ALLOWED_PROTOCOLS = ['http:', 'https:']

// 外链协议校验：IPC 与窗口 window.open 拦截共用
export function isSafeExternalUrl(url: string): boolean {
  try {
    return ALLOWED_PROTOCOLS.includes(new URL(url).protocol)
  } catch {
    return false
  }
}

export function registerShellIpc(): void {
  ipcMain.handle(
    'shell:openExternal',
    async (_e, payload: { url: string }): Promise<IpcResponse<null>> => {
      try {
        const { url } = payload ?? {}
        if (!url || typeof url !== 'string') {
          return fail(IPC_UNKNOWN, '缺少 url 参数')
        }
        if (!isSafeExternalUrl(url)) {
          return fail(IPC_UNKNOWN, '不允许的链接（仅支持 http/https）')
        }
        await shell.openExternal(url)
        return ok(null)
      } catch (err) {
        return fail(IPC_UNKNOWN, String(err))
      }
    }
  )
}
