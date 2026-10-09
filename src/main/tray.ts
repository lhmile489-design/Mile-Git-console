// 系统托盘管理
import { Tray, Menu, app, nativeImage } from 'electron'
import type { BrowserWindow } from 'electron'
import { join } from 'path'

export function createTray(mainWindow: BrowserWindow): Tray {
  const iconPath = join(__dirname, '../../resources/icon.png')
  // Windows 托盘图标建议 16x16 或 32x32，nativeImage 会自动缩放
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 32, height: 32 })

  const tray = new Tray(icon)
  tray.setToolTip('Mile Git Management')

  const updateContextMenu = (): void => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示 Mile Git Management',
        click: () => {
          mainWindow.show()
          mainWindow.focus()
          if (process.platform !== 'darwin') {
            mainWindow.setSkipTaskbar(false)
          }
        }
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          // 先解绑 close 拦截，再 quit
          mainWindow.removeAllListeners('close')
          app.quit()
        }
      }
    ])
    tray.setContextMenu(contextMenu)
  }

  updateContextMenu()

  // 左键单击：切换窗口显示/隐藏
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
      if (process.platform !== 'darwin') {
        mainWindow.setSkipTaskbar(true)
      } else {
        app.dock?.hide()
      }
    } else {
      mainWindow.show()
      mainWindow.focus()
      if (process.platform !== 'darwin') {
        mainWindow.setSkipTaskbar(false)
      } else {
        app.dock?.show()
      }
    }
  })

  return tray
}
