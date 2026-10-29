// 新建 / 重命名工作区的名称输入框
import React, { useEffect, useState } from 'react'
import { FormDialog } from '../common'

const NAME_MAX = 30

export interface WorkspaceNameDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  mode: 'create' | 'rename'
  initialName: string
  // 返回 false 表示失败（如重名），对话框保持打开
  onSubmit: (name: string) => Promise<boolean>
}

function WorkspaceNameDialog({
  isOpen,
  onOpenChange,
  mode,
  initialName,
  onSubmit
}: WorkspaceNameDialogProps): React.ReactElement {
  const [name, setName] = useState(initialName)

  // 每次打开都从当前值重新开始，避免残留上一次输入
  useEffect(() => {
    if (isOpen) setName(initialName)
  }, [isOpen, initialName])

  const trimmed = name.trim()

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={mode === 'create' ? '新建工作区' : '重命名工作区'}
      submitLabel={mode === 'create' ? '创建' : '保存'}
      submitDisabled={trimmed.length === 0}
      onSubmit={() => onSubmit(trimmed)}
    >
      <label className="ui-field">
        <span className="ui-field-label">工作区名称</span>
        <input
          className="ui-input"
          type="text"
          autoFocus
          maxLength={NAME_MAX}
          placeholder="例如：公司项目、个人学习"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
    </FormDialog>
  )
}

export default WorkspaceNameDialog
