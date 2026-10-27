// 应用设置 API 封装
import type { AppSettings } from '../types/ipc'
import { invoke } from './_invoke'

export const getSettings = async (): Promise<AppSettings> => {
  const data = await invoke<Record<string, unknown>>('settings:get', {})
  return data as unknown as AppSettings
}

// 读取单个设置项；key 支持 electron-store 的点号路径（如 layout.fileListWidth）
export const getSetting = async (key: string): Promise<unknown> => {
  const data = await invoke<Record<string, unknown>>('settings:get', { key })
  return data[key]
}

export const setSetting = (key: string, value: unknown): Promise<null> =>
  invoke('settings:set', { key, value })
