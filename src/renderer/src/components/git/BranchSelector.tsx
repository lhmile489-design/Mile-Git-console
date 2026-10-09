import React, { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, GitBranch, Loader2, Plus } from 'lucide-react'
import { useAppStore } from '../../store/appStore'

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

  // 点击面板外关闭
  useEffect(() => {
    if (!open) return
    const onMouseDown = (e: MouseEvent): void => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
        setCreating(false)
        setNewName('')
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  useEffect(() => {
    if (creating) inputRef.current?.focus()
  }, [creating])

  const localBranches = branches.filter((b) => !b.isRemote)
  const currentBranch = gitStatus?.branch ?? ''

  const close = (): void => {
    setOpen(false)
    setCreating(false)
    setNewName('')
  }

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
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {loadingAction === 'switch' ? (
          <Loader2 size={14} className="spin" />
        ) : (
          <GitBranch size={14} />
        )}
        <span className="branch-chip-name">{currentBranch || '…'}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="branch-dropdown" role="listbox">
          {localBranches.map((b) => (
            <button
              key={b.name}
              className={`branch-item${b.name === currentBranch ? ' current' : ''}`}
              onClick={() => void handleSwitch(b.name)}
            >
              <span className="branch-item-check">
                {b.name === currentBranch && <Check size={14} />}
              </span>
              <span className="branch-item-name">{b.name}</span>
            </button>
          ))}
          <div className="branch-divider" />
          {creating ? (
            <div className="branch-new-input-row">
              <GitBranch size={14} />
              <input
                ref={inputRef}
                className="branch-new-input"
                placeholder="新分支名称"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleCreate()
                  if (e.key === 'Escape') {
                    setCreating(false)
                    setNewName('')
                  }
                }}
              />
            </div>
          ) : (
            <button className="branch-item" onClick={() => setCreating(true)}>
              <span className="branch-item-check">
                <Plus size={14} />
              </span>
              <span className="branch-item-name">新建分支</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default BranchSelector
