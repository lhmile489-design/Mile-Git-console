// 编辑仓库：别名、备注、所属工作区
import React, { useEffect, useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { FormDialog } from '../common'
import type { RepoItem } from '../../types/ipc'

const ALIAS_MAX = 50
const NOTE_MAX = 500

export interface RepoEditDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  // 关闭动画期间仍需要仓库信息，所以关闭时不清空
  repo: RepoItem | null
}

function RepoEditDialog({ isOpen, onOpenChange, repo }: RepoEditDialogProps): React.ReactElement {
  const workspaces = useAppStore((s) => s.workspaces)
  const updateRepoMeta = useAppStore((s) => s.updateRepoMeta)
  const [alias, setAlias] = useState('')
  const [note, setNote] = useState('')
  const [workspaceId, setWorkspaceId] = useState<number | null>(null)

  useEffect(() => {
    if (isOpen && repo) {
      setAlias(repo.alias ?? '')
      setNote(repo.note ?? '')
      setWorkspaceId(repo.workspaceId)
    }
  }, [isOpen, repo])

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="编辑仓库"
      submitLabel="保存"
      onSubmit={async () => {
        if (!repo) return false
        await updateRepoMeta(repo.id, { alias: alias.trim(), note: note.trim(), workspaceId })
      }}
    >
      <p className="ui-field-hint selectable" title={repo?.path}>
        {repo?.path}
      </p>
      <label className="ui-field">
        <span className="ui-field-label">别名</span>
        <input
          className="ui-input"
          type="text"
          autoFocus
          maxLength={ALIAS_MAX}
          placeholder={repo ? `不填则显示目录名：${repo.name}` : ''}
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
        />
      </label>
      <label className="ui-field">
        <span className="ui-field-label">备注</span>
        <textarea
          className="ui-input"
          rows={3}
          maxLength={NOTE_MAX}
          placeholder="这个仓库是做什么的、有什么要注意的"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      <label className="ui-field">
        <span className="ui-field-label">所属工作区</span>
        <select
          className="ui-input ui-select"
          value={workspaceId === null ? '' : String(workspaceId)}
          onChange={(e) => setWorkspaceId(e.target.value === '' ? null : Number(e.target.value))}
        >
          <option value="">未分组</option>
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </label>
    </FormDialog>
  )
}

export default RepoEditDialog
