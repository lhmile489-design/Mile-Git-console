import React from 'react'
import { Minus, Settings, Square, X } from 'lucide-react'
import { windowMinimize, windowMaximize, windowClose } from '../../api/git'
import { useAppStore } from '../../store/appStore'
import { IconButton } from '../common'
import appIcon from '@resources/icon.png'

function Titlebar(): React.ReactElement {
  const view = useAppStore((s) => s.view)
  const setView = useAppStore((s) => s.setView)

  return (
    <div className="titlebar">
      <div className="titlebar-title">
        <span className="titlebar-mark">
          <img src={appIcon} alt="" className="titlebar-app-icon" />
        </span>
        <span>Mile Git Management</span>
      </div>
      <div className="titlebar-right">
        <IconButton
          label="设置"
          isActive={view === 'settings'}
          className="titlebar-settings-btn"
          onPress={() => setView(view === 'settings' ? 'main' : 'settings')}
        >
          <Settings size={16} />
        </IconButton>
        {/* 窗口按钮保持系统习惯的方形热区，不用圆角图标按钮 */}
        <div className="titlebar-controls">
          <button
            className="titlebar-btn"
            aria-label="最小化"
            onClick={() => void windowMinimize()}
          >
            <Minus size={16} />
          </button>
          <button
            className="titlebar-btn"
            aria-label="最大化"
            onClick={() => void windowMaximize()}
          >
            <Square size={13} />
          </button>
          <button
            className="titlebar-btn titlebar-btn-close"
            aria-label="关闭"
            onClick={() => void windowClose()}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default Titlebar
