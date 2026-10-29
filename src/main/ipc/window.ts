// 窗口控制 IPC（自定义标题栏按钮使用）
import { ipcMain, BrowserWindow, app } from 'electron'
import { ok, fail, IPC_UNKNOWN, type IpcResponse } from '../types/ipc'
import { applyWindowMaterial } from '../windowMaterial'

export function registerWindowIpc(): void {
  ipcMain.handle('window:minimize', async (e): Promise<IpcResponse<null>> => {
    try {
      BrowserWindow.fromWebContents(e.sender)?.minimize()
      return ok(null)
    } catch (err) {
      return fail(IPC_UNKNOWN, String(err))
    }
  })

  ipcMain.handle('window:maximize', async (e): Promise<IpcResponse<null>> => {
    try {
      const win = BrowserWindow.fromWebContents(e.sender)
      if (win?.isMaximized()) win.unmaximize()
      else win?.maximize()
      return ok(null)
    } catch (err) {
      return fail(IPC_UNKNOWN, String(err))
    }
  })

  ipcMain.handle('window:close', async (e): Promise<IpcResponse<null>> => {
    try {
      BrowserWindow.fromWebContents(e.sender)?.close()
      return ok(null)
    } catch (err) {
      return fail(IPC_UNKNOWN, String(err))
    }
  })

  ipcMain.handle('window:hide', async (e): Promise<IpcResponse<null>> => {
    try {
      const win = BrowserWindow.fromWebContents(e.sender)
      if (win) {
        win.hide()
        if (process.platform !== 'darwin') {
          win.setSkipTaskbar(true)
        } else {
          app.dock?.hide()
        }
      }
      return ok(null)
    } catch (err) {
      return fail(IPC_UNKNOWN, String(err))
    }
  })

  // 窗口级材质：渲染进程启动时与切换「减少视觉效果」时调用；返回是否实际生效
  ipcMain.handle(
    'window:material',
    async (e, payload: { enabled?: boolean }): Promise<IpcResponse<{ active: boolean }>> => {
      try {
        const win = BrowserWindow.fromWebContents(e.sender)
        if (!win) return ok({ active: false })
        return ok({ active: applyWindowMaterial(win, payload?.enabled === true) })
      } catch (err) {
        return fail(IPC_UNKNOWN, String(err))
      }
    }
  )

  ipcMain.handle('window:show', async (e): Promise<IpcResponse<null>> => {
    try {
      const win = BrowserWindow.fromWebContents(e.sender)
      if (win) {
        win.show()
        win.focus()
        if (process.platform !== 'darwin') {
          win.setSkipTaskbar(false)
        } else {
          app.dock?.show()
        }
      }
      return ok(null)
    } catch (err) {
      return fail(IPC_UNKNOWN, String(err))
    }
  })
}
