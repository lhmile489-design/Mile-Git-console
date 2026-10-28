import React, { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, GitBranch, Loader2, Plus } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { usePresence } from '../../hooks/usePresence'

// 分支选择器：药丸形按钮 + 下拉菜单（菜单样式与 ActionBar 共用 popover-menu / menu-item）
function BranchSelector(): React.ReactElement {
  const gitStatus = useAppStore((s) => s.gitStatus)
  const branches = useAppStore((s) => s.branches)
  const loadingAction = useAppStore((s) => s.loading.action)
  const switchBranch = useAppStore((s) => s.switchBranch)
  const createBranch = useAppStore((s) => s.createBranch)

  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const close = (): void => {
    setOpen(false)
    setCreating(false)
    setNewName('')
  }

  // 点击面板外或按 Esc 关闭
  useEffect(() => {
    if (!open) return
    const onMouseDown = (e: MouseEvent): void => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close()
    }
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (creating) inputRef.current?.focus()
  }, [creating])

  const presence = usePresence(open, 150)
  const localBranches = branches.filter((b) => !b.isRemote)
  const currentBranch = gitStatus?.branch ?? ''

  const handleSwitch = async (name: string): Promise<void> => {
    close()
    if (name !== currentBranch) await switchBranch(name)
  }

  const handleCreate = async (): Promise<void> => {
    const name = newName.trim()
    if (!name) return
    close()
    await createBranch(name)
  }

  return (
    <div className="branch-selector" ref={rootRef}>
      <button
        className="branch-chip"
        onClick={() => (open ? close() : setOpen(true))}
        aria-haspopup="menu"
        aria-expanded={open}
        title={currentBranch}
      >
        {loadingAction === 'switch' ? (
          <Loader2 size={16} className="spin" />
        ) : (
          <GitBranch size={16} />
        )}
        <span className="branch-chip-name">{currentBranch || '…'}</span>
        <ChevronDown size={16} className="branch-chip-caret" />
      </button>
      {presence.mounted && (
        <div
          className="popover-menu branch-menu"
          role="menu"
          aria-label="切换分支"
          data-state={presence.state}
        >
          <div className="menu-label">本地分支</div>
          <div className="branch-menu-list">
            {localBranches.map((b) => (
              <button
                key={b.name}
                role="menuitemradio"
                aria-checked={b.name === currentBranch}
                className={`menu-item${b.name === currentBranch ? ' is-current' : ''}`}
                onClick={() => void handleSwitch(b.name)}
              >
                <span className="menu-item-check">
                  {b.name === currentBranch && <Check size={16} />}
                </span>
                <span className="menu-item-text">{b.name}</span>
              </button>
            ))}
          </div>
          <div className="menu-divider" />
          {creating ? (
            <div className="branch-new-row">
              <input
                ref={inputRef}
                className="ui-input"
                aria-label="新分支名称"
                placeholder="新分支名称，回车创建"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleCreate()
                  if (e.key === 'Escape') {
                    // 只退出输入态，不关闭整个菜单
                    e.stopPropagation()
                    e.nativeEvent.stopImmediatePropagation()
                    setCreating(false)
                    setNewName('')
                  }
                }}
              />
            </div>
          ) : (
            <button role="menuitem" className="menu-item" onClick={() => setCreating(true)}>
              <span className="menu-item-check">
                <Plus size={16} />
              </span>
              <span className="menu-item-text">新建分支</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default BranchSelector
