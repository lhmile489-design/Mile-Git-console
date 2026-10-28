// 命令注册表：快捷键与（后续的）命令面板共用同一份命令列表
import { useAppStore } from '../store/appStore'

export interface Shortcut {
  key: string // KeyboardEvent.key，字母统一小写
  mod?: boolean // Ctrl（macOS 为 Cmd）
  shift?: boolean
}

export interface Command {
  id: string
  label: string
  shortcut?: Shortcut
  // 焦点在输入框里时是否仍然响应
  allowInInput?: boolean
  enabled: () => boolean
  run: () => void
}

const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)

function hasActiveRepo(): boolean {
  const s = useAppStore.getState()
  return s.activeRepoId !== null && s.view === 'main'
}

function remoteIdle(): boolean {
  const s = useAppStore.getState()
  return hasActiveRepo() && (s.gitStatus?.hasRemote ?? false) && s.loading.action === null
}

export const COMMANDS: Command[] = [
  {
    id: 'status.refresh',
    label: '刷新状态',
    shortcut: { key: 'F5' },
    allowInInput: true,
    enabled: hasActiveRepo,
    run: () => void useAppStore.getState().refreshStatus()
  },
  {
    id: 'view.changes',
    label: '切换到更改',
    shortcut: { key: '1', mod: true },
    allowInInput: true,
    enabled: hasActiveRepo,
    run: () => useAppStore.getState().setMainView('changes')
  },
  {
    id: 'view.history',
    label: '切换到历史',
    shortcut: { key: '2', mod: true },
    allowInInput: true,
    enabled: hasActiveRepo,
    run: () => useAppStore.getState().setMainView('history')
  },
  {
    id: 'remote.push',
    label: '推送',
    shortcut: { key: 'p', mod: true, shift: true },
    enabled: remoteIdle,
    run: () => void useAppStore.getState().push(false)
  },
  {
    id: 'remote.pull',
    label: '拉取',
    shortcut: { key: 'l', mod: true, shift: true },
    enabled: remoteIdle,
    run: () => void useAppStore.getState().pull()
  }
]

export function matchShortcut(e: KeyboardEvent, s: Shortcut): boolean {
  const mod = isMac ? e.metaKey : e.ctrlKey
  return (
    e.key.length === 1 ? e.key.toLowerCase() === s.key : e.key === s.key
  ) && mod === !!s.mod && e.shiftKey === !!s.shift && !e.altKey
}

// 显示用的快捷键文字，例如「Ctrl+Shift+P」
export function formatShortcut(s: Shortcut): string {
  const parts: string[] = []
  if (s.mod) parts.push(isMac ? 'Cmd' : 'Ctrl')
  if (s.shift) parts.push('Shift')
  parts.push(s.key.length === 1 ? s.key.toUpperCase() : s.key)
  return parts.join('+')
}

export function shortcutHint(id: string): string {
  const c = COMMANDS.find((x) => x.id === id)
  return c?.shortcut ? formatShortcut(c.shortcut) : ''
}
