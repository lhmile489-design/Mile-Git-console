// 滑动选中指示层：放在列表的滚动容器里，测量选中行的位置，用 transform 滑过去
// 容器必须是 position: relative；行需要比指示层高一层（z-index: 1）
// 第一次出现时直接定位不滑动，之后切换选中项才播放位移动画
import React, { useLayoutEffect, useRef, useState } from 'react'

export interface SelectionIndicatorProps {
  containerRef: React.RefObject<HTMLElement | null>
  // 选中行的选择器，在容器内查找
  selector: string
  // 选中项或列表内容变化时传入新值，触发重新测量
  watch: unknown
}

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

function SelectionIndicator({
  containerRef,
  selector,
  watch
}: SelectionIndicatorProps): React.ReactElement | null {
  const [rect, setRect] = useState<Rect | null>(null)
  const [animate, setAnimate] = useState(false)
  const wasVisible = useRef(false)

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    const measure = (): void => {
      const el = container.querySelector<HTMLElement>(selector)
      if (!el) {
        wasVisible.current = false
        setAnimate(false)
        setRect(null)
        return
      }
      // 用 offset 系列而不是 getBoundingClientRect：行在播放进场位移动画时，
      // 后者会把 transform 算进去，指示层会偏几个像素。offset 只看布局位置，也不受滚动影响
      let x = 0
      let y = 0
      let node: HTMLElement | null = el
      while (node && node !== container) {
        x += node.offsetLeft
        y += node.offsetTop
        node = node.offsetParent as HTMLElement | null
      }
      // 容器不是选中行的定位祖先时（不应发生）不画指示层，避免画到错误位置
      if (node !== container) {
        setRect(null)
        return
      }
      setAnimate(wasVisible.current)
      wasVisible.current = true
      setRect({ x, y, width: el.offsetWidth, height: el.offsetHeight })
    }

    measure()
    // 容器尺寸变化（拖拽列表宽度）和列表增删（折叠分组、加载更多）都要重新测量
    const ro = new ResizeObserver(measure)
    ro.observe(container)
    const mo = new MutationObserver(measure)
    mo.observe(container, { childList: true, subtree: true })
    return () => {
      ro.disconnect()
      mo.disconnect()
    }
  }, [containerRef, selector, watch])

  if (!rect) return null
  return (
    <span
      className={`ui-selection-indicator${animate ? ' is-animated' : ''}`}
      aria-hidden="true"
      style={{
        width: rect.width,
        height: rect.height,
        transform: `translate(${rect.x}px, ${rect.y}px)`
      }}
    />
  )
}

export default SelectionIndicator
