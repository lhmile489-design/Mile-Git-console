import { app, shell, BrowserWindow, dialog, nativeImage } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase } from './storage/db'
import { registerAllIpc } from './ipc'
import { createTray } from './tray'
import { loadWindowState, trackWindowState } from './windowState'

function createWindow(): void {
  // 加载应用图标（resources/ 目录，开发模式与生产模式路径一致）
  const iconPath = join(__dirname, '../../resources/icon.png')
  const icon = nativeImage.createFromPath(iconPath)

  // 恢复上次的窗口尺寸与位置；位置已不在任何显示器上时只恢复尺寸
  const saved = loadWindowState()

  const mainWindow = new BrowserWindow({
    width: saved.bounds?.width ?? 1280,
    height: saved.bounds?.height ?? 800,
    ...(saved.bounds && saved.positionValid ? { x: saved.bounds.x, y: saved.bounds.y } : {}),
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    // frame: false 完全隐藏系统原生标题栏，由自定义 Titlebar 组件接管窗口控制
    frame: false,
    icon,
    // 启动时不在 Windows 任务栏显示；窗口显示时通过 setSkipTaskbar(false) 恢复
    skipTaskbar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // 安全配置：启用 Chromium 进程沙盒（Electron 20+ 默认值），contextBridge 在沙盒下同样工作正常
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  const saveWindowState = trackWindowState(mainWindow)
  app.on('before-quit', saveWindowState)

  mainWindow.on('ready-to-show', () => {
    if (saved.maximized) mainWindow.maximize()
    mainWindow.show()
    // 窗口显示后恢复任务栏图标
    if (process.platform !== 'darwin') {
      mainWindow.setSkipTaskbar(false)
    }
  })

  // 拦截关闭事件：改为隐藏窗口，应用继续在托盘运行
  mainWindow.on('close', (event) => {
    event.preventDefault()
    saveWindowState()
    mainWindow.hide()
    if (process.platform !== 'darwin') {
      mainWindow.setSkipTaskbar(true)
    } else {
      app.dock?.hide()
    }
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

  // 创建系统托盘（窗口创建完成后再挂载）
  createTray(mainWindow)
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
  // 所有平台：window-all-closed 不主动退出，交给托盘菜单「退出」控制
  // macOS 通常不退出（app.quit 会在托盘菜单里手动触发）
})
