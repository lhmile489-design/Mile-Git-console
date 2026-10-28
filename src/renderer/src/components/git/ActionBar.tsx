import React, { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowDown, ArrowUp, ChevronDown, Download, Loader2, X } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { Button, ConfirmDialog } from '../common'
import { shortcutHint } from '../../commands/registry'
import { usePresence } from '../../hooks/usePresence'

const REMOTE_OPS = ['fetch', 'pull', 'push'] as const
type RemoteOp = (typeof REMOTE_OPS)[number]

// git 进度阶段的中文说明；未知阶段统一显示「进行中」
// stage 取自 git stderr 首个单词（simple-git 转小写）：服务端阶段整体以 "remote:" 开头
const STAGE_LABEL: Record<string, string> = {
  'remote:': '远端准备',
  enumerating: '枚举对象',
  unpacking: '解包对象',
  counting: '统计对象',
  compressing: '压缩对象',
  receiving: '接收对象',
  resolving: '处理差异',
  writing: '写入对象'
}

// 远端操作开始多久后才显示取消按钮，避免短操作时按钮一闪而过
const CANCEL_DELAY_MS = 2000

function isRemoteOp(action: string | null): action is RemoteOp {
  return action !== null && (REMOTE_OPS as readonly string[]).includes(action)
}

// 获取 / 拉取 / 推送合并为一个按钮组：共享外框，中间 1px 分隔
function ActionBar(): React.ReactElement {
  const gitStatus = useAppStore((s) => s.gitStatus)
  const loadingAction = useAppStore((s) => s.loading.action)
  const fetchRemote = useAppStore((s) => s.fetch)
  const pull = useAppStore((s) => s.pull)
  const push = useAppStore((s) => s.push)
  const cancelRemote = useAppStore((s) => s.cancelRemote)
  const remoteProgress = useAppStore((s) => s.remoteProgress)

  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmForcePush, setConfirmForcePush] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const remoteRunning = isRemoteOp(loadingAction)
  const menuPresence = usePresence(menuOpen, 150)

  // 远端操作进行超过 CANCEL_DELAY_MS 才露出取消按钮；操作结束立即收起
  useEffect(() => {
    if (!remoteRunning) {
      setShowCancel(false)
      setCancelling(false)
      return
    }
    const timer = setTimeout(() => setShowCancel(true), CANCEL_DELAY_MS)
    return () => clearTimeout(timer)
  }, [remoteRunning, loadingAction])

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

  // 进行中的按钮把文字换成「阶段 百分比」，没收到进度时保持原文字
  const renderLabel = (action: RemoteOp, label: string): React.ReactNode => {
    if (loadingAction !== action || !remoteProgress || remoteProgress.op !== action) return label
    const stage = STAGE_LABEL[remoteProgress.stage] ?? '进行中'
    return (
      <span className="action-progress" aria-live="polite">
        {stage} {Math.round(remoteProgress.progress)}%
      </span>
    )
  }

  const handleCancel = (): void => {
    setCancelling(true)
    void cancelRemote()
  }

  return (
    <div className="action-group" ref={menuRef}>
      <Button size="sm" variant="ghost" isDisabled={disabled} onPress={() => void fetchRemote()}>
        {renderIcon('fetch', <Download size={16} />)}
        {renderLabel('fetch', '获取')}
      </Button>
      <span className="action-group-divider" aria-hidden="true" />
      <Button size="sm" variant="ghost" isDisabled={disabled} hint={`拉取（${shortcutHint('remote.pull')}）`} onPress={() => void pull()}>
        {renderIcon('pull', <ArrowDown size={16} />)}
        {renderLabel('pull', '拉取')}
        {behind > 0 && loadingAction !== 'pull' && <span className="action-badge">{behind}</span>}
      </Button>
      <span className="action-group-divider" aria-hidden="true" />
      <Button size="sm" variant="ghost" isDisabled={disabled} hint={`推送（${shortcutHint('remote.push')}）`} onPress={() => void push(false)}>
        {renderIcon('push', <ArrowUp size={16} />)}
        {renderLabel('push', '推送')}
        {ahead > 0 && loadingAction !== 'push' && <span className="action-badge">{ahead}</span>}
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
      {remoteRunning && showCancel && (
        <>
          <span className="action-group-divider" aria-hidden="true" />
          <Button
            size="sm"
            variant="ghost"
            className="action-group-cancel"
            isDisabled={cancelling}
            onPress={handleCancel}
          >
            <X size={16} />
            {cancelling ? '正在取消' : '取消'}
          </Button>
        </>
      )}
      {menuPresence.mounted && (
        <div className="popover-menu action-group-menu" role="menu" data-state={menuPresence.state}>
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
      {/* 远端进度条：宽度由 scaleX 驱动，只动 transform */}
      {remoteRunning && (
        <span className="action-progress-track" aria-hidden="true">
          <span
            className={`action-progress-bar${remoteProgress ? '' : ' is-indeterminate'}`}
            style={remoteProgress ? { transform: `scaleX(${Math.min(1, Math.max(0, remoteProgress.progress / 100))})` } : undefined}
          />
        </span>
      )}
    </div>
  )
}

export default ActionBar
