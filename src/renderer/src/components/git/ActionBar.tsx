import React, { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowDown, ArrowUp, ChevronDown, Download, Loader2 } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { Button, ConfirmDialog } from '../common'

// 获取 / 拉取 / 推送合并为一个按钮组：共享外框，中间 1px 分隔
function ActionBar(): React.ReactElement {
  const gitStatus = useAppStore((s) => s.gitStatus)
  const loadingAction = useAppStore((s) => s.loading.action)
  const fetchRemote = useAppStore((s) => s.fetch)
  const pull = useAppStore((s) => s.pull)
  const push = useAppStore((s) => s.push)

  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmForcePush, setConfirmForcePush] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 点击菜单外关闭
  useEffect(() => {
    if (!menuOpen) return
    const onMouseDown = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const hasRemote = gitStatus?.hasRemote ?? false
  const ahead = gitStatus?.ahead ?? 0
  const behind = gitStatus?.behind ?? 0
  const disabled = !hasRemote || loadingAction !== null

  const renderIcon = (action: string, icon: React.ReactNode): React.ReactNode =>
    loadingAction === action ? <Loader2 size={16} className="spin" /> : icon

  return (
    <div className="action-group" ref={menuRef}>
      <Button size="sm" variant="ghost" isDisabled={disabled} onPress={() => void fetchRemote()}>
        {renderIcon('fetch', <Download size={16} />)}
        获取
      </Button>
      <span className="action-group-divider" aria-hidden="true" />
      <Button size="sm" variant="ghost" isDisabled={disabled} onPress={() => void pull()}>
        {renderIcon('pull', <ArrowDown size={16} />)}
        拉取
        {behind > 0 && <span className="action-badge">{behind}</span>}
      </Button>
      <span className="action-group-divider" aria-hidden="true" />
      <Button size="sm" variant="ghost" isDisabled={disabled} onPress={() => void push(false)}>
        {renderIcon('push', <ArrowUp size={16} />)}
        推送
        {ahead > 0 && <span className="action-badge">{ahead}</span>}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="action-group-toggle"
        aria-label="更多推送选项"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        isDisabled={disabled}
        onPress={() => setMenuOpen((v) => !v)}
      >
        <ChevronDown size={16} />
      </Button>
      {menuOpen && (
        <div className="popover-menu action-group-menu" role="menu">
          <button
            className="menu-item menu-item-danger"
            role="menuitem"
            autoFocus
            onClick={() => {
              setMenuOpen(false)
              setConfirmForcePush(true)
            }}
          >
            <AlertTriangle size={16} />
            强制推送（Force Push）
          </button>
        </div>
      )}
      {/* 确认框是兄弟节点而不是菜单子节点，菜单关闭时不会被一并卸载 */}
      <ConfirmDialog
        isOpen={confirmForcePush}
        onOpenChange={setConfirmForcePush}
        title="强制推送"
        confirmLabel="强制推送"
        onConfirm={() => void push(true)}
      >
        强制推送会用本地历史覆盖远端分支历史，远端上他人未合并的提交可能丢失。此操作不可撤销，确定要继续吗？
      </ConfirmDialog>
    </div>
  )
}

export default ActionBar
