import React, { useState } from 'react'
import {
  ActionButton,
  AlertDialog,
  DialogTrigger
} from '@adobe/react-spectrum'
import {
  Check,
  ChevronDown,
  Minus,
  Plus,
  Undo2
} from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import type { GitFileStatus, GitFileStatusType } from '../../types/ipc'

const STATUS_META: Record<GitFileStatusType, { letter: string; cls: string }> = {
  added: { letter: 'A', cls: 'status-added' },
  modified: { letter: 'M', cls: 'status-modified' },
  deleted: { letter: 'D', cls: 'status-deleted' },
  renamed: { letter: 'R', cls: 'status-renamed' },
  untracked: { letter: '?', cls: 'status-untracked' },
  conflict: { letter: '!', cls: 'status-conflict' }
}

export function StatusBadge({ status }: { status: GitFileStatusType }): React.ReactElement {
  const meta = STATUS_META[status]
  return <span className={`status-badge ${meta.cls}`}>{meta.letter}</span>
}

function splitPath(p: string): { name: string; dir: string } {
  const idx = p.lastIndexOf('/')
  if (idx < 0) return { name: p, dir: '' }
  return { name: p.slice(idx + 1), dir: p.slice(0, idx) }
}

interface FileRowProps {
  file: GitFileStatus
  checked: boolean
  onCheck: (path: string, checked: boolean) => void
}

function FileRow({ file, checked, onCheck }: FileRowProps): React.ReactElement {
  const selectedFile = useAppStore((s) => s.selectedFile)
  const selectFile = useAppStore((s) => s.selectFile)
  const stage = useAppStore((s) => s.stage)
  const unstage = useAppStore((s) => s.unstage)
  const discard = useAppStore((s) => s.discard)

  const selected =
    selectedFile?.path === file.path && selectedFile?.staged === file.staged
  const { name, dir } = splitPath(file.path)

  return (
    <div
      className={`file-row${selected ? ' selected' : ''}`}
      onClick={() => void selectFile({ path: file.path, staged: file.staged })}
    >
      {/* 复选框 */}
      <span
        className="file-row-checkbox"
        onClick={(e) => {
          e.stopPropagation()
          onCheck(file.path, !checked)
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheck(file.path, e.target.checked)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`选择 ${file.path}`}
        />
      </span>
      <StatusBadge status={file.status} />
      <div className="file-row-info">
        <span className="file-name">{name}</span>
        <span className="file-dir" title={file.oldPath ? `${file.oldPath} → ${file.path}` : file.path}>
          {file.oldPath ? `${splitPath(file.oldPath).name} → ${dir || file.path}` : dir}
        </span>
      </div>
      {file.status === 'conflict' && <span className="file-conflict-tag">冲突</span>}
      <span className="file-row-actions">
        {file.staged ? (
          <button
            className="icon-btn"
            aria-label="取消暂存"
            title="取消暂存"
            onClick={(e) => {
              e.stopPropagation()
              void unstage([file.path])
            }}
          >
            <Minus size={14} />
          </button>
        ) : (
          <>
            <button
              className="icon-btn"
              aria-label="暂存"
              title="暂存"
              onClick={(e) => {
                e.stopPropagation()
                void stage([file.path])
              }}
            >
              <Plus size={14} />
            </button>
            <span onClick={(e) => e.stopPropagation()}>
              <DialogTrigger>
                <ActionButton isQuiet aria-label="丢弃更改" UNSAFE_className="row-action-discard">
                  <Undo2 size={14} />
                </ActionButton>
                <AlertDialog
                  title="丢弃更改"
                  variant="destructive"
                  primaryActionLabel="丢弃"
                  cancelLabel="取消"
                  onPrimaryAction={() => void discard([file.path])}
                >
                  将丢弃「{file.path}」的所有未暂存更改，此操作不可恢复。确定要继续吗？
                </AlertDialog>
              </DialogTrigger>
            </span>
          </>
        )}
      </span>
    </div>
  )
}

interface FileGroupProps {
  title: string
  files: GitFileStatus[]
  staged: boolean
}

function FileGroup({ title, files, staged }: FileGroupProps): React.ReactElement | null {
  const stage = useAppStore((s) => s.stage)
  const unstage = useAppStore((s) => s.unstage)
  const [collapsed, setCollapsed] = useState(false)
  const [checkedPaths, setCheckedPaths] = useState<Set<string>>(new Set())

  if (files.length === 0) return null

  const handleCheck = (path: string, checked: boolean): void => {
    setCheckedPaths((prev) => {
      const next = new Set(prev)
      if (checked) next.add(path)
      else next.delete(path)
      return next
    })
  }

  const checkedList = files.filter((f) => checkedPaths.has(f.path)).map((f) => f.path)
  const hasChecked = checkedList.length > 0

  const handleBatchAction = (): void => {
    if (!hasChecked) return
    void (staged ? unstage(checkedList) : stage(checkedList)).then(() =>
      setCheckedPaths(new Set())
    )
  }

  return (
    <div className="file-group">
      <div className="file-group-header" onClick={() => setCollapsed((v) => !v)}>
        <ChevronDown
          size={14}
          className={`file-group-chevron${collapsed ? ' collapsed' : ''}`}
        />
        <span className="file-group-title">{title}</span>
        <span className="file-count-badge">{files.length}</span>
        <div className="file-group-actions" onClick={(e) => e.stopPropagation()}>
          {hasChecked && (
            <button
              className="file-group-action file-group-action-primary"
              onClick={handleBatchAction}
            >
              {staged ? <Minus size={12} /> : <Plus size={12} />}
              {staged ? `取消暂存所选(${checkedList.length})` : `暂存所选(${checkedList.length})`}
            </button>
          )}
          <button
            className="file-group-action"
            onClick={() => void (staged ? unstage(['.']) : stage(['.']))}
          >
            {staged ? <Minus size={12} /> : <Plus size={12} />}
            {staged ? '全部取消暂存' : '全部暂存'}
          </button>
        </div>
      </div>
      {!collapsed && (
        <div className="file-list">
          {files.map((f) => (
            <FileRow
              key={`${f.path}:${f.staged}`}
              file={f}
              checked={checkedPaths.has(f.path)}
              onCheck={handleCheck}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function StatusPanel(): React.ReactElement {
  const gitStatus = useAppStore((s) => s.gitStatus)

  const files = gitStatus?.files ?? []
  const stagedFiles = files.filter((f) => f.staged)
  const unstagedFiles = files.filter((f) => !f.staged)

  if (files.length === 0) {
    return (
      <div className="status-panel">
        <div className="empty-state">
          <Check size={32} />
          <span>工作区干净，没有变更</span>
        </div>
      </div>
    )
  }

  return (
    <div className="status-panel">
      <FileGroup title="暂存的更改" files={stagedFiles} staged />
      <FileGroup title="更改" files={unstagedFiles} staged={false} />
    </div>
  )
}

export default StatusPanel
