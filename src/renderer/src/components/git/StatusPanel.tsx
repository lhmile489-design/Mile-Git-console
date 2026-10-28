import React, { useRef, useState } from 'react'
import { ChevronDown, Minus, Plus, Sparkles, Undo2 } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { ConfirmDialog, IconButton, SelectionIndicator } from '../common'
import type { GitFileStatus, GitFileStatusType } from '../../types/ipc'

const STATUS_META: Record<GitFileStatusType, { letter: string; cls: string; label: string }> = {
  added: { letter: 'A', cls: 'status-added', label: '新增' },
  modified: { letter: 'M', cls: 'status-modified', label: '修改' },
  deleted: { letter: 'D', cls: 'status-deleted', label: '删除' },
  renamed: { letter: 'R', cls: 'status-renamed', label: '重命名' },
  untracked: { letter: 'U', cls: 'status-untracked', label: '未跟踪' },
  conflict: { letter: '!', cls: 'status-conflict', label: '冲突' }
}

export function StatusBadge({ status }: { status: GitFileStatusType }): React.ReactElement {
  const meta = STATUS_META[status]
  return (
    <span className={`status-badge ${meta.cls}`} title={meta.label} aria-label={meta.label}>
      {meta.letter}
    </span>
  )
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
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const selected = selectedFile?.path === file.path && selectedFile?.staged === file.staged
  const { name, dir } = splitPath(file.path)
  const dirText = file.oldPath ? `${splitPath(file.oldPath).name} → ${dir || file.path}` : dir

  return (
    <div className={`file-row${selected ? ' selected' : ''}`}>
      <input
        type="checkbox"
        className="ui-checkbox"
        checked={checked}
        onChange={(e) => onCheck(file.path, e.target.checked)}
        aria-label={`选择 ${file.path}`}
      />
      {/* 选中区域、复选框、操作按钮互为兄弟节点，避免交互元素嵌套 */}
      <button
        className="file-row-main"
        aria-current={selected ? 'true' : undefined}
        title={file.oldPath ? `${file.oldPath} → ${file.path}` : file.path}
        onClick={() => void selectFile({ path: file.path, staged: file.staged })}
      >
        <StatusBadge status={file.status} />
        <span className="file-name">{name}</span>
        {dirText && <span className="file-dir">{dirText}</span>}
        {file.status === 'conflict' && <span className="file-conflict-tag">冲突</span>}
      </button>
      <span className="file-row-actions">
        {file.staged ? (
          <IconButton label="取消暂存" size="sm" onPress={() => void unstage([file.path])}>
            <Minus size={14} />
          </IconButton>
        ) : (
          <>
            <IconButton
              label="丢弃更改"
              size="sm"
              className="row-action-discard"
              onPress={() => setConfirmDiscard(true)}
            >
              <Undo2 size={14} />
            </IconButton>
            <IconButton label="暂存" size="sm" onPress={() => void stage([file.path])}>
              <Plus size={14} />
            </IconButton>
          </>
        )}
      </span>
      <ConfirmDialog
        isOpen={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="丢弃更改"
        confirmLabel="丢弃"
        onConfirm={() => void discard([file.path])}
      >
        将丢弃「{file.path}」的所有未暂存更改，此操作不可恢复。确定要继续吗？
      </ConfirmDialog>
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
    <section className="file-group">
      <div className="file-group-header">
        <button
          className="file-group-toggle"
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((v) => !v)}
        >
          <ChevronDown size={14} className={`file-group-chevron${collapsed ? ' collapsed' : ''}`} />
          <span className="file-group-title">{title}</span>
          <span className="count-badge">{files.length}</span>
        </button>
        <div className="file-group-actions">
          {hasChecked && (
            <button className="file-group-action file-group-action-primary" onClick={handleBatchAction}>
              {staged ? <Minus size={14} /> : <Plus size={14} />}
              {staged ? `取消所选 ${checkedList.length}` : `暂存所选 ${checkedList.length}`}
            </button>
          )}
          <button
            className="file-group-action"
            onClick={() => void (staged ? unstage(['.']) : stage(['.']))}
          >
            {staged ? <Minus size={14} /> : <Plus size={14} />}
            {staged ? '全部取消' : '全部暂存'}
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
    </section>
  )
}

function StatusPanel(): React.ReactElement {
  const gitStatus = useAppStore((s) => s.gitStatus)
  const selectedFile = useAppStore((s) => s.selectedFile)
  const panelRef = useRef<HTMLDivElement>(null)

  const files = gitStatus?.files ?? []
  const stagedFiles = files.filter((f) => f.staged)
  const unstagedFiles = files.filter((f) => !f.staged)

  if (files.length === 0) {
    return (
      <div className="status-panel">
        <div className="empty-state">
          <span className="empty-state-icon" aria-hidden="true">
            <Sparkles size={20} />
          </span>
          <span className="empty-state-title">工作区很干净</span>
          <span>没有需要提交的更改</span>
        </div>
      </div>
    )
  }

  return (
    <div className="status-panel" ref={panelRef}>
      <SelectionIndicator
        containerRef={panelRef}
        selector=".file-row.selected"
        watch={selectedFile ? `${selectedFile.path}:${selectedFile.staged}` : null}
      />
      <FileGroup title="暂存的更改" files={stagedFiles} staged />
      <FileGroup title="更改" files={unstagedFiles} staged={false} />
    </div>
  )
}

export default StatusPanel
