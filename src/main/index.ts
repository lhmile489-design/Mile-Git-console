import { app, shell, BrowserWindow, dialog, nativeImage, powerMonitor } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase, getRepoByPath } from './storage/db'
import { setRepoGuard } from './git'
import { registerAllIpc } from './ipc'
import { createTray } from './tray'
import { loadWindowState, trackWindowState } from './windowState'
import { showTrayHintOnce } from './trayHint'
import { materialSupported } from './windowMaterial'
import { isSafeExternalUrl } from './ipc/shell'
import { isQuitting, markQuitting } from './appState'

let mainWindowRef: BrowserWindow | null = null

// 显示并聚焦主窗口（第二实例启动、托盘唤起共用）
function revealWindow(win: BrowserWindow): void {
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
  if (process.platform !== 'darwin') win.setSkipTaskbar(false)
  else app.dock?.show()
}

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
    // 支持 Acrylic 时窗口本身透明，底色交给页面里半透明的 --color-bg-base
    ...(materialSupported() ? { backgroundColor: '#00000000' } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // 安全配置：启用 Chromium 进程沙盒（Electron 20+ 默认值），contextBridge 在沙盒下同样工作正常
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindowRef = mainWindow
  mainWindow.on('closed', () => {
    mainWindowRef = null
  })
  // Windows 关机 / 注销不会触发 before-quit，只能在窗口的会话结束事件里置位
  mainWindow.on('query-session-end', markQuitting)
  mainWindow.on('session-end', markQuitting)

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

  // 拦截关闭事件：改为隐藏窗口，应用继续在托盘运行。
  // 正在退出（托盘退出、Cmd+Q、系统关机 / 注销）时放行，否则应用退不掉
  mainWindow.on('close', (event) => {
    if (isQuitting()) {
      saveWindowState()
      return
    }
    event.preventDefault()
    saveWindowState()
    mainWindow.hide()
    void showTrayHintOnce()
    if (process.platform !== 'darwin') {
      mainWindow.setSkipTaskbar(true)
    } else {
      app.dock?.hide()
    }
  })

  // 页面里的新窗口一律拒绝；只有 http/https 外链交给系统浏览器
  mainWindow.webContents.setWindowOpenHandler((details) => {
    if (isSafeExternalUrl(details.url)) void shell.openExternal(details.url)
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

// 单实例：第二个进程直接退出，并唤起已有窗口（避免多个托盘图标、并发写 electron-store）
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindowRef && !mainWindowRef.isDestroyed()) revealWindow(mainWindowRef)
  })
}

// 任何退出途径（托盘、Cmd+Q、系统关机 / 注销触发的 quit）都先置位，close 不再拦截
app.on('before-quit', markQuitting)

app.whenReady().then(() => {
  if (!gotLock) return
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
  // 仓库闸门：git 命令只对已登记的仓库执行，渲染进程传入的任意目录一律拒绝
  setRepoGuard((repoPath) => getRepoByPath(repoPath) !== null)
  registerAllIpc()

  // macOS / Linux 关机：powerMonitor 只能在 ready 之后使用
  powerMonitor.on('shutdown', () => {
    markQuitting()
    app.quit()
  })

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
