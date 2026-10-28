import React from 'react'
import ReactDOM from 'react-dom/client'
import { I18nProvider } from 'react-aria-components'
import App from './App'
import { getSettings } from './api/settings'
// Nunito 本地打包（离线可用），只引入 latin 子集的 4 个字重（中文走系统回退）
import '@fontsource/nunito/latin-400.css'
import '@fontsource/nunito/latin-600.css'
import '@fontsource/nunito/latin-700.css'
import '@fontsource/nunito/latin-800.css'
import './styles/tokens.css'
import './styles/global.css'
import './styles/ui.css'
import './styles/components.css'

// 主题初始化：用户显式选择浅色 / 深色时写入 data-theme；
// 'system' 或读取失败时不写，交给 tokens.css 的 prefers-color-scheme 实时跟随系统
async function applySavedTheme(): Promise<void> {
  try {
    const settings = await getSettings()
    const t = settings.theme
    if (t === 'light' || t === 'dark') {
      document.documentElement.dataset.theme = t
      return
    }
  } catch {
    // 设置读取失败时回退到系统偏好
  }
  document.documentElement.removeAttribute('data-theme')
}

async function bootstrap(): Promise<void> {
  await applySavedTheme()

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      {/* react-aria 组件的本地化（日期、对话框无障碍文案等）；主题由 data-theme 控制 */}
      <I18nProvider locale="zh-CN">
        <App />
      </I18nProvider>
    </React.StrictMode>
  )
}

void bootstrap()
