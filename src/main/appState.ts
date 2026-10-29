// 应用级运行状态：是否正在退出。
// 主窗口 close 事件只在「未退出」时拦截为隐藏到托盘；系统关机、Cmd+Q、托盘「退出」都会先置位
let quitting = false

export function isQuitting(): boolean {
  return quitting
}

export function markQuitting(): void {
  quitting = true
}
