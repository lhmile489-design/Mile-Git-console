// 窗口级材质（V6 原型）：Windows 11 22H2 及以上用 Acrylic，让桌面从窗口底色里隐约透出
// 其他系统不支持，保持实底；是否开启由渲染进程按「减少视觉效果」设置决定
import os from 'os'
import type { BrowserWindow } from 'electron'

// setBackgroundMaterial 只支持 Windows 11 22H2（build 22621）及以上
export function materialSupported(): boolean {
  if (process.platform !== 'win32') return false
  const build = Number(os.release().split('.')[2])
  return Number.isFinite(build) && build >= 22621
}

// 开启或关闭材质，返回实际是否生效
export function applyWindowMaterial(win: BrowserWindow, enabled: boolean): boolean {
  if (!materialSupported() || win.isDestroyed()) return false
  try {
    win.setBackgroundMaterial(enabled ? 'acrylic' : 'none')
    return enabled
  } catch (err) {
    console.error('[windowMaterial] failed:', err)
    return false
  }
}
