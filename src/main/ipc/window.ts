// 窗口控制 IPC（自定义标题栏按钮使用）
import { ipcMain, BrowserWindow, app } from 'electron'
import { ok, fail, IPC_UNKNOWN, type IpcResponse } from '../types/ipc'

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
