// 应用设置 API 封装
import type { AppSettings } from '../types/ipc'
import { invoke } from './_invoke'

export const getSettings = async (): Promise<AppSettings> => {
  const data = await invoke<Record<string, unknown>>('settings:get', {})
  return data as unknown as AppSettings
}

export const setSetting = (key: string, value: unknown): Promise<null> =>
  invoke('settings:set', { key, value })
