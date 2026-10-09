import { app, shell, BrowserWindow, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase } from './storage/db'
import { registerAllIpc } from './ipc'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // 安全配置：启用 Chromium 进程沙盒（Electron 20+ 默认值），contextBridge 在沙盒下同样工作正常
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 开发模式加载 Vite dev server，生产加载打包文件
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // 设置 app 用户模型 ID（Windows 任务栏分组用）
  electronApp.setAppUserModelId('com.mile.git-management')

  // 初始化 SQLite（含迁移）并注册全部 IPC handler
  try {
    initDatabase()
  } catch (err) {
    dialog.showErrorBox(
      '数据库初始化失败',
      `应用无法启动，请检查用户数据目录是否可写。\n\n错误详情：${String(err)}`
    )
    app.quit()
    return
  }
  registerAllIpc()

  // 开发模式下 F12 打开 DevTools，生产模式忽略
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
