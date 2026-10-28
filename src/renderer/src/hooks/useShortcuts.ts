// 全局快捷键：从命令注册表取键位，统一在 window 上监听 keydown
import { useEffect } from 'react'
import { COMMANDS, matchShortcut } from '../commands/registry'

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
}

// 有模态对话框打开时不响应任何快捷键，避免在确认框背后触发操作
function dialogOpen(): boolean {
  return document.querySelector('.ui-modal-overlay') !== null
}

export function useShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.repeat || dialogOpen()) return
      const typing = isTypingTarget(e.target)
      for (const cmd of COMMANDS) {
        if (!cmd.shortcut || !matchShortcut(e, cmd.shortcut)) continue
        if (typing && !cmd.allowInInput) return
        // 命中键位就阻止默认行为（如 F5 整页重载），即使命令当前不可用
        e.preventDefault()
        if (cmd.enabled()) cmd.run()
        return
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
