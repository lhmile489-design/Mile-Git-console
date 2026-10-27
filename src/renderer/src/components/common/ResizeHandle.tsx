// 竖向拖拽手柄：鼠标拖动或键盘左右方向键调整左侧面板宽度
// 拖动过程中持续回调 onChange，松手（或键盘调整后）回调 onCommit 用于持久化
import React, { useRef } from 'react'

export interface ResizeHandleProps {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  onCommit: () => void
  label: string
}

const KEYBOARD_STEP = 16

function ResizeHandle({
  value,
  min,
  max,
  onChange,
  onCommit,
  label
}: ResizeHandleProps): React.ReactElement {
  const drag = useRef<{ startX: number; startValue: number } | null>(null)

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (e.button !== 0) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { startX: e.clientX, startValue: value }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (!drag.current) return
    onChange(drag.current.startValue + e.clientX - drag.current.startX)
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (!drag.current) return
    drag.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    onCommit()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    let next: number | null = null
    if (e.key === 'ArrowLeft') next = value - KEYBOARD_STEP
    else if (e.key === 'ArrowRight') next = value + KEYBOARD_STEP
    else if (e.key === 'Home') next = min
    else if (e.key === 'End') next = max
    if (next === null) return
    e.preventDefault()
    onChange(next)
    onCommit()
  }

  return (
    <div
      className="ui-resize-handle"
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={handleKeyDown}
    >
      <span className="ui-resize-handle-grip" aria-hidden="true" />
    </div>
  )
}

export default ResizeHandle
