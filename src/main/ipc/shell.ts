// shell 操作 IPC handler（仅允许 http/https 协议，防止 file:// 等危险跳转）
import { ipcMain, shell } from 'electron'
import { ok, fail, IPC_UNKNOWN, type IpcResponse } from '../types/ipc'

const ALLOWED_PROTOCOLS = ['http:', 'https:']

export function registerShellIpc(): void {
  ipcMain.handle(
    'shell:openExternal',
    async (_e, payload: { url: string }): Promise<IpcResponse<null>> => {
      try {
        const { url } = payload ?? {}
        if (!url || typeof url !== 'string') {
          return fail(IPC_UNKNOWN, '缺少 url 参数')
        }
        let parsed: URL
        try {
          parsed = new URL(url)
        } catch {
          return fail(IPC_UNKNOWN, 'URL 格式无效')
        }
        if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
          return fail(IPC_UNKNOWN, `不允许的协议：${parsed.protocol}（仅支持 http/https）`)
        }
        await shell.openExternal(url)
        return ok(null)
      } catch (err) {
        return fail(IPC_UNKNOWN, String(err))
      }
    }
  )
}
