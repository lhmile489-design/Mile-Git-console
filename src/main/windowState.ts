// 窗口大小、位置、最大化状态的持久化（userData/window-state.json，同步读写，建窗口前即可用）
import { app, screen, type BrowserWindow, type Rectangle } from 'electron'
import fs from 'fs'
import path from 'path'

export interface WindowState {
  bounds: Rectangle | null
  maximized: boolean
}

// 读出的状态：positionValid 为 false 时只用尺寸，位置交给系统居中
export interface LoadedWindowState extends WindowState {
  positionValid: boolean
}

const FILE = path.join(app.getPath('userData'), 'window-state.json')
const MIN_WIDTH = 1024
const MIN_HEIGHT = 700
const SAVE_DELAY_MS = 500

function isRect(v: unknown): v is Rectangle {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  return ['x', 'y', 'width', 'height'].every((k) => typeof r[k] === 'number' && Number.isFinite(r[k]))
}

// 窗口至少有一块与某个显示器的工作区重叠才恢复位置；否则（如拔掉副屏）只恢复尺寸
function visibleOnSomeDisplay(b: Rectangle): boolean {
  return screen.getAllDisplays().some(({ workArea: w }) => {
    const overlapX = Math.min(b.x + b.width, w.x + w.width) - Math.max(b.x, w.x)
    const overlapY = Math.min(b.y + b.height, w.y + w.height) - Math.max(b.y, w.y)
    return overlapX >= 100 && overlapY >= 50
  })
}

export function loadWindowState(): LoadedWindowState {
  const empty: LoadedWindowState = { bounds: null, maximized: false, positionValid: false }
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(FILE, 'utf-8'))
    if (typeof parsed !== 'object' || parsed === null) return empty
    const p = parsed as Record<string, unknown>
    const maximized = p.maximized === true
    if (!isRect(p.bounds)) return { ...empty, maximized }
    const bounds = {
      x: Math.round(p.bounds.x),
      y: Math.round(p.bounds.y),
      width: Math.max(MIN_WIDTH, Math.round(p.bounds.width)),
      height: Math.max(MIN_HEIGHT, Math.round(p.bounds.height))
    }
    return { bounds, maximized, positionValid: visibleOnSomeDisplay(bounds) }
  } catch {
    // 首次启动或文件损坏：用默认尺寸
    return empty
  }
}

function writeState(state: WindowState): void {
  try {
    fs.writeFileSync(FILE, JSON.stringify(state), 'utf-8')
  } catch (err) {
    console.error('[windowState] save failed:', err)
  }
}

// 监听窗口变化并延迟保存。最大化时只记标志，保留最大化前的普通尺寸
export function trackWindowState(win: BrowserWindow): () => void {
  let timer: NodeJS.Timeout | null = null

  const save = (): void => {
    if (win.isDestroyed() || win.isMinimized()) return
    writeState({ bounds: win.getNormalBounds(), maximized: win.isMaximized() })
  }
  const schedule = (): void => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(save, SAVE_DELAY_MS)
  }

  win.on('resize', schedule)
  win.on('move', schedule)
  win.on('maximize', schedule)
  win.on('unmaximize', schedule)

  // 返回立即保存函数：关闭（隐藏到托盘）和退出前调用
  return () => {
    if (timer) clearTimeout(timer)
    timer = null
    save()
  }
}
