// 右下角提示卡片队列：最多 3 条叠放，新的在下
// 错误不自动消失；普通提示 3 秒、带操作按钮的 5 秒后消失；鼠标悬停或键盘焦点在卡片内时暂停计时
import React, { useEffect, useRef, useState } from 'react'
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { useAppStore, type Toast } from '../../store/appStore'
import { Button, IconButton } from '../common'

const DURATION_MS = 3000
const DURATION_WITH_ACTION_MS = 5000

function ToastItem({ toast }: { toast: Toast }): React.ReactElement {
  const dismiss = useAppStore((s) => s.dismissToast)
  const [paused, setPaused] = useState(false)
  // 剩余时长跨暂停保留，避免悬停后计时从头开始
  const remaining = useRef(toast.action ? DURATION_WITH_ACTION_MS : DURATION_MS)

  useEffect(() => {
    if (toast.kind === 'error' || paused) return
    const startedAt = Date.now()
    const timer = setTimeout(() => dismiss(toast.id), remaining.current)
    return () => {
      clearTimeout(timer)
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt))
    }
  }, [toast.id, toast.kind, paused, dismiss])

  const isError = toast.kind === 'error'
  const icon = isError ? (
    <CircleAlert size={16} />
  ) : toast.kind === 'success' ? (
    <CircleCheck size={16} />
  ) : (
    <Info size={16} />
  )

  return (
    <div
      className={`toast toast-${toast.kind}`}
      role={isError ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false)
      }}
    >
      <span className="toast-icon" aria-hidden="true">
        {icon}
      </span>
      <span className={`toast-text${isError ? ' selectable' : ''}`} title={toast.text}>
        {toast.text}
      </span>
      {toast.action && (
        <Button
          size="sm"
          variant="ghost"
          className="toast-action"
          onPress={() => {
            toast.action?.run()
            dismiss(toast.id)
          }}
        >
          {toast.action.label}
        </Button>
      )}
      <IconButton label="关闭提示" size="sm" onPress={() => dismiss(toast.id)}>
        <X size={14} />
      </IconButton>
    </div>
  )
}

function ToastStack(): React.ReactElement {
  const toasts = useAppStore((s) => s.toasts)
  // 容器常驻，读屏软件才能稳定播报新加入的提示
  return (
    <div className="toast-stack" aria-live="polite" aria-relevant="additions">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  )
}

export default ToastStack
