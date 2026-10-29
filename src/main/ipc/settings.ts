// 应用设置 IPC handlers（electron-store，ESM 动态引入以兼容 CJS 主进程）
import { ipcMain } from 'electron'
import {
  ok,
  fail,
  IPC_STORAGE_FAILED,
  IPC_BAD_PAYLOAD,
  type IpcResponse
} from '../types/ipc'

type Store = import('electron-store').default

// 渲染进程允许写入的设置项及其取值校验；不在表内的 key 一律拒绝。
// 主进程内部直接调用 setSetting（如托盘提示标记）不受此限制
const WRITABLE: Record<string, (v: unknown) => boolean> = {
  theme: (v) => v === 'light' || v === 'dark' || v === 'system',
  'ui.reduceEffects': (v) => typeof v === 'boolean',
  'layout.fileListWidth': (v) => typeof v === 'number' && Number.isFinite(v) && v > 0 && v < 10000,
  // 远端名会进入 push 参数：只允许字母数字与 . _ -，且不能以 - 开头
  defaultRemote: (v) => typeof v === 'string' && /^[A-Za-z0-9._][A-Za-z0-9._-]{0,99}$/.test(v),
  commitMessageTemplate: (v) => typeof v === 'string' && v.length <= 2000
}

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

export async function setSetting(key: string, value: unknown): Promise<void> {
  const store = await getStore()
  store.set(key, value)
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
        if (!payload?.key) return fail(IPC_BAD_PAYLOAD, '缺少设置 key')
        const validate = WRITABLE[payload.key]
        if (!validate) return fail(IPC_BAD_PAYLOAD, `不允许修改的设置项：${payload.key}`)
        if (!validate(payload.value)) return fail(IPC_BAD_PAYLOAD, `设置值不合法：${payload.key}`)
        const store = await getStore()
        store.set(payload.key, payload.value)
        return ok(null)
      } catch (err) {
        return fail(IPC_STORAGE_FAILED, String(err))
      }
    }
  )
}
