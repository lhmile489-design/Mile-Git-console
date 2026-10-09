import React from 'react'
import { Minus, Settings, Square, X } from 'lucide-react'
import { windowMinimize, windowMaximize, windowClose } from '../../api/git'
import { useAppStore } from '../../store/appStore'
import appIcon from '@resources/icon.png'

function Titlebar(): React.ReactElement {
  const view = useAppStore((s) => s.view)
  const setView = useAppStore((s) => s.setView)

  return (
    <div className="titlebar">
      <div className="titlebar-title">
        <img src={appIcon} alt="app-icon" className="titlebar-app-icon" />
        <span>Mile Git Management</span>
      </div>
      <div className="titlebar-right">
        <button
          className={`icon-btn titlebar-settings-btn${view === 'settings' ? ' active' : ''}`}
          aria-label="设置"
          title="设置"
          onClick={() => setView(view === 'settings' ? 'main' : 'settings')}
        >
          <Settings size={14} />
        </button>
        <div className="titlebar-controls">
          <button
            className="titlebar-btn"
            aria-label="最小化"
            onClick={() => void windowMinimize()}
          >
            <Minus size={14} />
          </button>
          <button
            className="titlebar-btn"
            aria-label="最大化"
            onClick={() => void windowMaximize()}
          >
            <Square size={12} />
          </button>
          <button
            className="titlebar-btn titlebar-btn-close"
            aria-label="关闭"
            onClick={() => void windowClose()}
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default Titlebar
