// 窗口级材质（V6 原型）：向主进程请求 Acrylic，只有实际生效时才在 <html> 上写 data-material
// 「减少视觉效果」或系统「减少透明度」开启时不请求材质

// 连续切换时多次请求的返回可能乱序，只采纳最后一次请求的结果
let seq = 0

export async function syncWindowMaterial(): Promise<void> {
  const root = document.documentElement
  const want =
    !root.hasAttribute('data-reduce-effects') &&
    !window.matchMedia('(prefers-reduced-transparency: reduce)').matches
  const mine = ++seq

  // 关闭时先让页面变回实底，再撤掉材质，避免中间闪一下透明
  if (!want) root.removeAttribute('data-material')
  try {
    const res = await window.electronAPI.invoke<{ active: boolean }>('window:material', {
      enabled: want
    })
    if (mine !== seq) return
    if (want && res.code === 0 && res.data?.active) root.setAttribute('data-material', '')
    else root.removeAttribute('data-material')
  } catch {
    if (mine === seq) root.removeAttribute('data-material')
  }
}
