// 第一次点关闭时提示「应用仍在托盘运行」。窗口此时已隐藏，所以用系统通知而不是界面内提示
import { Notification } from 'electron'
import { getSetting, setSetting } from './ipc/settings'

const KEY = 'ui.trayHintShown'

export async function showTrayHintOnce(): Promise<void> {
  try {
    if ((await getSetting(KEY)) === true) return
    // 先写标志再弹，避免连续关闭时弹出多次
    await setSetting(KEY, true)
    if (!Notification.isSupported()) return
    new Notification({
      title: 'Mile Git Management 仍在运行',
      body: '窗口已最小化到系统托盘。点击托盘图标可重新打开，右键托盘图标选择「退出」可完全关闭。'
    }).show()
  } catch (err) {
    // 提示失败不影响关闭
    console.error('[trayHint] failed:', err)
  }
}
