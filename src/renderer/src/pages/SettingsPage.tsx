import React, { useEffect, useState } from 'react'
import { ArrowLeft, ExternalLink, Monitor, Moon, Sun } from 'lucide-react'
import { useAppStore } from '../store/appStore'

type ThemeValue = 'light' | 'dark' | 'system'

const THEME_OPTIONS: { value: ThemeValue; label: string; icon: React.ReactElement }[] = [
  { value: 'light', label: '浅色', icon: <Sun size={16} /> },
  { value: 'dark', label: '深色', icon: <Moon size={16} /> },
  { value: 'system', label: '跟随系统', icon: <Monitor size={16} /> }
]

function applyTheme(theme: ThemeValue): void {
  if (theme === 'system') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', theme)
  }
}

function SettingsPage(): React.ReactElement {
  const setView = useAppStore((s) => s.setView)
  const [theme, setTheme] = useState<ThemeValue>('system')

  // 启动时从持久化读取主题
  useEffect(() => {
    void window.electronAPI
      .invoke<Record<string, unknown>>('settings:get', { key: 'theme' })
      .then((res) => {
        const saved = res.data?.['theme']
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setTheme(saved)
          applyTheme(saved)
        }
      })
  }, [])

  const handleThemeChange = (value: ThemeValue): void => {
    setTheme(value)
    applyTheme(value)
    void window.electronAPI.invoke('settings:set', { key: 'theme', value })
  }

  const handleOpenGitHub = (): void => {
    void window.electronAPI.invoke('shell:openExternal', {
      url: 'https://github.com/lhmile489-design/Mile-Git-console.git'
    })
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <button
          className="icon-btn settings-back-btn"
          aria-label="返回"
          onClick={() => setView('main')}
        >
          <ArrowLeft size={16} />
        </button>
        <span className="settings-title">设置</span>
      </div>

      <div className="settings-content">
        {/* 区块一：外观 */}
        <section className="settings-section">
          <h2 className="settings-section-title">外观</h2>
          <div className="settings-item">
            <div className="settings-item-label">主题</div>
            <div className="theme-selector">
              {THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`theme-option${theme === opt.value ? ' active' : ''}`}
                  onClick={() => handleThemeChange(opt.value)}
                >
                  {opt.icon}
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 区块二：关于 */}
        <section className="settings-section">
          <h2 className="settings-section-title">关于</h2>
          <div className="settings-item">
            <div className="settings-item-label">应用名称</div>
            <div className="settings-item-value">Mile Git Management</div>
          </div>
          <div className="settings-item">
            <div className="settings-item-label">版本</div>
            <div className="settings-item-value">0.2.0</div>
          </div>
          <div className="settings-item">
            <div className="settings-item-label">源代码</div>
            <button className="settings-link" onClick={handleOpenGitHub}>
              <ExternalLink size={13} />
              <span>GitHub 仓库</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

export default SettingsPage
