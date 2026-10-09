import React, { useEffect, useRef, useState } from 'react'
import {
  ActionButton,
  AlertDialog,
  DialogContainer
} from '@adobe/react-spectrum'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Download,
  Loader2
} from 'lucide-react'
import { useAppStore } from '../../store/appStore'

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
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [menuOpen])

  const hasRemote = gitStatus?.hasRemote ?? false
  const ahead = gitStatus?.ahead ?? 0
  const busy = loadingAction !== null

  const renderIcon = (action: string, icon: React.ReactNode): React.ReactNode =>
    loadingAction === action ? <Loader2 size={14} className="spin" /> : icon

  return (
    <div className="action-bar">
      <button
        className="btn"
        disabled={!hasRemote || busy}
        onClick={() => void fetchRemote()}
      >
        {renderIcon('fetch', <Download size={14} />)}
        获取
      </button>
      <button
        className="btn"
        disabled={!hasRemote || busy}
        onClick={() => void pull()}
      >
        {renderIcon('pull', <ArrowDown size={14} />)}
        拉取
      </button>
      <div className="push-split" ref={menuRef}>
        <button
          className="btn"
          disabled={!hasRemote || busy}
          onClick={() => void push(false)}
        >
          {renderIcon('push', <ArrowUp size={14} />)}
          推送
          {ahead > 0 && <span className="action-badge">{ahead}</span>}
        </button>
        <button
          className="push-menu-toggle"
          aria-label="更多推送选项"
          disabled={!hasRemote || busy}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <ChevronDown size={14} />
        </button>
        {menuOpen && (
          <div className="push-menu">
            <ActionButton
              isQuiet
              UNSAFE_className="push-menu-item-danger"
              onPress={() => {
                setMenuOpen(false)
                setConfirmForcePush(true)
              }}
            >
              <AlertTriangle size={14} />
              <span>强制推送 (Force Push)</span>
            </ActionButton>
          </div>
        )}
      </div>
      {/* AlertDialog 必须挂在菜单外，否则菜单关闭时弹窗被一并卸载 */}
      <DialogContainer onDismiss={() => setConfirmForcePush(false)}>
        {confirmForcePush && (
          <AlertDialog
            title="强制推送"
            variant="destructive"
            primaryActionLabel="强制推送"
            cancelLabel="取消"
            onPrimaryAction={() => void push(true)}
          >
            强制推送会用本地历史覆盖远端分支历史，远端上他人未合并的提交可能丢失。此操作不可撤销，确定要继续吗？
          </AlertDialog>
        )}
      </DialogContainer>
    </div>
  )
}

export default ActionBar
