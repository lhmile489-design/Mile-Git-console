// 应用设置 IPC handlers（electron-store，ESM 动态引入以兼容 CJS 主进程）
import { ipcMain } from 'electron'
import {
  ok,
  fail,
  IPC_STORAGE_FAILED,
  type IpcResponse
} from '../types/ipc'

type Store = import('electron-store').default

const DEFAULTS: Record<string, unknown> = {
  theme: 'system',
  language: 'zh-CN',
  commitMessageTemplate: '',
  defaultRemote: 'origin'
}

let storeInstance: Store | null = null

async function getStore(): Promise<Store> {
  if (!storeInstance) {
    const { default: ElectronStore } = await import('electron-store')
    storeInstance = new ElectronStore({ defaults: DEFAULTS })
  }
  return storeInstance
}

export async function getSetting(key: string): Promise<unknown> {
  const store = await getStore()
  return store.get(key)
}

export function registerSettingsIpc(): void {
  ipcMain.handle(
    'settings:get',
    async (_e, payload: { key?: string }): Promise<IpcResponse<Record<string, unknown>>> => {
      try {
        const store = await getStore()
        if (payload?.key) {
          return ok({ [payload.key]: store.get(payload.key) })
        }
        return ok({ ...DEFAULTS, ...store.store })
      } catch (err) {
        return fail(IPC_STORAGE_FAILED, String(err))
      }
    }
  )

  ipcMain.handle(
    'settings:set',
    async (
      _e,
      payload: { key: string; value: unknown }
    ): Promise<IpcResponse<null>> => {
      try {
        if (!payload?.key) return fail(IPC_STORAGE_FAILED, '缺少设置 key')
        const store = await getStore()
        store.set(payload.key, payload.value)
        return ok(null)
      } catch (err) {
        return fail(IPC_STORAGE_FAILED, String(err))
      }
    }
  )
}
