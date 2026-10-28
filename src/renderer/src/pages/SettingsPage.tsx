// 设置页：居中单列卡片组（外观、关于），主题用三张带配色缩略预览的可选卡片
import React, { useEffect, useState } from 'react'
import { ArrowLeft, ExternalLink, Monitor, Moon, Sun } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { Button, IconButton, Panel } from '../components/common'

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

// 缩略预览：用 data-theme 局部套用对应主题的令牌，跟随系统时左右各半
function ThemePreview({ value }: { value: ThemeValue }): React.ReactElement {
  if (value === 'system') {
    return (
      <span className="theme-preview theme-preview-split" aria-hidden="true">
        <span className="theme-preview-half" data-theme="light">
          <span className="theme-preview-card" />
        </span>
        <span className="theme-preview-half" data-theme="dark">
          <span className="theme-preview-card" />
        </span>
      </span>
    )
  }
  return (
    <span className="theme-preview" data-theme={value} aria-hidden="true">
      <span className="theme-preview-side" />
      <span className="theme-preview-main">
        <span className="theme-preview-card" />
        <span className="theme-preview-bar" />
      </span>
    </span>
  )
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
      <div className="settings-column">
        <div className="settings-header">
          <IconButton label="返回" onPress={() => setView('main')}>
            <ArrowLeft size={16} />
          </IconButton>
          <h1 className="settings-title">设置</h1>
        </div>

        <Panel as="section" className="settings-card" aria-labelledby="settings-appearance">
          <h2 id="settings-appearance" className="settings-card-title">
            外观
          </h2>
          <div className="settings-field-label" id="theme-label">
            主题
          </div>
          <div className="theme-selector" role="radiogroup" aria-labelledby="theme-label">
            {THEME_OPTIONS.map((opt) => {
              const active = theme === opt.value
              return (
                <button
                  key={opt.value}
                  role="radio"
                  aria-checked={active}
                  className={`theme-option${active ? ' active' : ''}`}
                  onClick={() => handleThemeChange(opt.value)}
                >
                  <ThemePreview value={opt.value} />
                  <span className="theme-option-label">
                    {opt.icon}
                    {opt.label}
                  </span>
                </button>
              )
            })}
          </div>
        </Panel>

        <Panel as="section" className="settings-card" aria-labelledby="settings-about">
          <h2 id="settings-about" className="settings-card-title">
            关于
          </h2>
          <dl className="settings-list">
            <div className="settings-row">
              <dt>应用名称</dt>
              <dd>Mile Git Management</dd>
            </div>
            <div className="settings-row">
              <dt>版本</dt>
              <dd>2.0.0</dd>
            </div>
            <div className="settings-row">
              <dt>源代码</dt>
              <dd>
                <Button size="sm" variant="ghost" onPress={handleOpenGitHub}>
                  <ExternalLink size={14} />
                  GitHub 仓库
                </Button>
              </dd>
            </div>
          </dl>
        </Panel>
      </div>
    </div>
  )
}

export default SettingsPage
