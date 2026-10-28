// 拖拽文件夹到窗口即可导入仓库；拖动时窗口显示投放遮罩
import { useEffect, useState } from 'react'
import { useAppStore } from '../store/appStore'

// 只响应从系统拖入的文件，页面内的文字、元素拖动不触发
function hasFiles(e: DragEvent): boolean {
  return Array.from(e.dataTransfer?.types ?? []).includes('Files')
}

export function useFolderDrop(): boolean {
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    // dragenter / dragleave 在子元素间会成对触发，用计数判断是否真正离开窗口
    let depth = 0

    const onEnter = (e: DragEvent): void => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth++
      setDragging(true)
    }
    const onOver = (e: DragEvent): void => {
      if (!hasFiles(e)) return
      // 必须阻止默认行为，否则 drop 不会触发，Electron 会直接打开文件
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    }
    const onLeave = (e: DragEvent): void => {
      if (!hasFiles(e)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setDragging(false)
    }
    const onDrop = (e: DragEvent): void => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth = 0
      setDragging(false)
      const s = useAppStore.getState()
      const files = Array.from(e.dataTransfer?.files ?? [])
      const paths = files.map((f) => window.electronAPI.getPathForFile(f)).filter(Boolean)
      if (paths.length === 0) {
        s.pushToast('error', '无法读取拖入项目的路径')
        return
      }
      // 逐个导入；不是 Git 仓库的由主进程返回错误，提示卡片给出原因
      void (async () => {
        for (const p of paths) await s.importRepoPath(p)
      })()
    }

    window.addEventListener('dragenter', onEnter)
    window.addEventListener('dragover', onOver)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onEnter)
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [])

  return dragging
}
