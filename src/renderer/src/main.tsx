import React from 'react'
import ReactDOM from 'react-dom/client'
import { I18nProvider } from 'react-aria-components'
import App from './App'
import { getSetting, getSettings } from './api/settings'
import { syncWindowMaterial } from './utils/windowMaterial'
// 微交互主题字体本地打包（CSP 禁止外链，离线可用）：Inter 正文 + Manrope 标题，只引入 latin 子集（中文走系统回退）
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/manrope/latin-600.css'
import '@fontsource/manrope/latin-700.css'
import '@fontsource/manrope/latin-800.css'
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

// 「减少视觉效果」：关闭玻璃模糊与全部动画（设置页开关，键 ui.reduceEffects）
async function applyReduceEffects(): Promise<void> {
  try {
    if ((await getSetting('ui.reduceEffects')) === true) {
      document.documentElement.setAttribute('data-reduce-effects', '')
    }
  } catch {
    // 读取失败保持默认（开启视觉效果）
  }
}

async function bootstrap(): Promise<void> {
  await Promise.all([applySavedTheme(), applyReduceEffects()])
  // 材质依赖「减少视觉效果」的结果，放在它之后；系统「减少透明度」变化时重新判断
  void syncWindowMaterial()
  window
    .matchMedia('(prefers-reduced-transparency: reduce)')
    .addEventListener('change', () => void syncWindowMaterial())

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
