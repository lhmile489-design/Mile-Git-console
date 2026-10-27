import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider, defaultTheme } from '@adobe/react-spectrum'
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

type ColorScheme = 'light' | 'dark'

// 主题初始化：优先读用户设置（默认 dark），'system' 时跟随操作系统
async function resolveColorScheme(): Promise<ColorScheme> {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  try {
    const settings = await getSettings()
    const t = settings.theme
    if (t === 'light' || t === 'dark') return t
  } catch {
    // 设置读取失败时回退到系统偏好
  }
  return prefersDark ? 'dark' : 'light'
}

async function bootstrap(): Promise<void> {
  const scheme = await resolveColorScheme()
  document.documentElement.dataset.theme = scheme

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <Provider theme={defaultTheme} colorScheme={scheme} locale="zh-CN">
        <App />
      </Provider>
    </React.StrictMode>
  )
}

void bootstrap()
