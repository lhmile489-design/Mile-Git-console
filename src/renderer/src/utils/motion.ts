// 动效公共工具：判断是否关闭动画，以及包装原生 View Transitions
import { flushSync } from 'react-dom'

// 系统「减少动画」或设置里「减少视觉效果」时关闭所有过渡
export function motionDisabled(): boolean {
  return (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.hasAttribute('data-reduce-effects')
  )
}

type StartViewTransition = (cb: () => void) => { updateCallbackDone: Promise<void>; finished: Promise<void> }

export interface ViewTransitionOptions {
  // 位移方向，写到 <html data-vt-dir>
  dir?: 'forward' | 'back'
  // 过渡种类，写到 <html data-vt>；CSS 只在对应种类下给元素命名，避免无关元素参与截图
  kind?: 'view' | 'files'
}

// 用 View Transitions 包住一次状态更新：浏览器先截旧画面，回调里同步渲染新状态，再在两者之间过渡
// 不支持或关闭动画时直接更新；返回的 Promise 在新状态已经写入 DOM 后完成
export function withViewTransition(update: () => void, opts: ViewTransitionOptions = {}): Promise<void> {
  const start = (document as unknown as { startViewTransition?: StartViewTransition })
    .startViewTransition
  if (!start || motionDisabled()) {
    update()
    return Promise.resolve()
  }
  const root = document.documentElement
  if (opts.dir) root.dataset.vtDir = opts.dir
  if (opts.kind) root.dataset.vt = opts.kind
  const t = start.call(document, () => flushSync(update))
  void t.finished
    .catch(() => {
      // 过渡被打断（例如快速连续切换）不影响状态，忽略
    })
    .finally(() => {
      delete root.dataset.vtDir
      delete root.dataset.vt
    })
  return t.updateCallbackDone.catch(() => undefined)
}

// 文件路径转成合法的 view-transition-name（CSS 标识符），同一路径始终得到同一个名字
export function vtNameForPath(path: string): string {
  let h = 5381
  for (let i = 0; i < path.length; i++) h = ((h << 5) + h + path.charCodeAt(i)) | 0
  return `vt-file-${(h >>> 0).toString(36)}`
}
