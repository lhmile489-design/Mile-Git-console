// 窗口重新获得焦点时静默刷新工作区状态：在外部编辑器改了文件，回到应用即可看到最新列表
import { useEffect } from 'react'
import { useAppStore } from '../store/appStore'

// 两次刷新的最小间隔，避免快速切换窗口时连续触发 git status
const MIN_INTERVAL_MS = 2000

export function useFocusRefresh(): void {
  useEffect(() => {
    let last = 0

    const refresh = (): void => {
      const s = useAppStore.getState()
      // 没有仓库、在设置页、远端操作进行中、历史视图时都不刷新
      if (s.activeRepoId === null || s.view !== 'main' || s.mainView !== 'changes') return
      if (s.loading.action !== null) return
      const now = Date.now()
      if (now - last < MIN_INTERVAL_MS) return
      last = now
      void s.refreshStatus({ silent: true })
    }

    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') refresh()
    }

    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])
}
