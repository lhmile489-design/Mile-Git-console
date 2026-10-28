// 骨架屏：加载超过 delay 才显示，避免快速加载时闪一下
// 光带扫过只用 transform；variant="code" 用于 Diff，行更窄更密
import React, { useEffect, useState } from 'react'

export interface SkeletonProps {
  rows?: number
  delay?: number
  variant?: 'list' | 'code'
  label?: string
}

// 每行宽度固定取值，避免每次渲染随机跳动
const LIST_WIDTHS = [72, 54, 86, 63, 78, 48, 69, 58]
const CODE_WIDTHS = [42, 66, 81, 35, 74, 58, 90, 47, 63, 70, 38, 55]

function Skeleton({
  rows = 6,
  delay = 200,
  variant = 'list',
  label = '加载中'
}: SkeletonProps): React.ReactElement | null {
  const [show, setShow] = useState(delay <= 0)

  useEffect(() => {
    if (delay <= 0) return
    const timer = setTimeout(() => setShow(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  if (!show) return null
  const widths = variant === 'code' ? CODE_WIDTHS : LIST_WIDTHS
  return (
    <div className={`ui-skeleton ui-skeleton-${variant}`} role="status" aria-label={label}>
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} className="ui-skeleton-row" style={{ width: `${widths[i % widths.length]}%` }} />
      ))}
    </div>
  )
}

export default Skeleton
