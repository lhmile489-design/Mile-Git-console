import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider, defaultTheme } from '@adobe/react-spectrum'
import App from './App'
import { getSettings } from './api/settings'
import './styles/tokens.css'
import './styles/global.css'
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
