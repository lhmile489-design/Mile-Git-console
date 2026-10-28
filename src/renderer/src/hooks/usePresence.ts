// 进出场状态：关闭时先保持挂载并标记 exiting，等离开动画播完再卸载
// 用法：const p = usePresence(open, 150)；p.mounted 为假时不渲染；把 p.state 写到 data-state 上
// 进入动画写在元素的基础选择器上（挂载即播放），离开动画写在 [data-state='exiting'] 上
import { useEffect, useRef, useState } from 'react'

export type PresenceState = 'open' | 'exiting'

// 系统「减少动画」或设置里「减少视觉效果」时不等待离开动画，直接卸载
function motionDisabled(): boolean {
  return (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.hasAttribute('data-reduce-effects')
  )
}

export function usePresence(
  open: boolean,
  exitMs: number
): { mounted: boolean; state: PresenceState } {
  const [mounted, setMounted] = useState(open)
  const [state, setState] = useState<PresenceState>('open')
  // 用 ref 读取挂载状态，避免把 mounted 放进依赖导致关闭后重复触发
  const mountedRef = useRef(open)
  mountedRef.current = mounted

  useEffect(() => {
    if (open) {
      setMounted(true)
      setState('open')
      return
    }
    if (!mountedRef.current) return
    if (motionDisabled()) {
      setMounted(false)
      return
    }
    setState('exiting')
    const timer = setTimeout(() => setMounted(false), exitMs)
    return () => clearTimeout(timer)
  }, [open, exitMs])

  return { mounted, state }
}
