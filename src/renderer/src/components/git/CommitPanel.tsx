// 提交区：位于文件列表卡片底部，只针对暂存区的文件
import React, { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { useAppStore, useActiveRepo } from '../../store/appStore'
import { useCommitDraft } from '../../hooks/useCommitDraft'
import { Button } from '../common'

function CommitPanel(): React.ReactElement {
  const gitStatus = useAppStore((s) => s.gitStatus)
  const commit = useAppStore((s) => s.commit)

  const repoPath = useActiveRepo()?.path ?? null
  // 草稿按仓库保存，切换仓库不串内容
  const { draft, update, clear } = useCommitDraft(repoPath)
  const { summary, description } = draft
  const [submitting, setSubmitting] = useState(false)

  const stagedCount = (gitStatus?.files ?? []).filter((f) => f.staged).length
  const branch = gitStatus?.branch ?? ''
  const hasSummary = summary.trim().length > 0
  const canCommit = hasSummary && stagedCount > 0 && !submitting

  // 按钮禁用时在下方说明原因
  const hint =
    stagedCount === 0
      ? '暂存区为空，先暂存要提交的文件'
      : !hasSummary
        ? '填写提交摘要后即可提交'
        : `将提交到 ${branch}`

  const handleCommit = async (): Promise<void> => {
    if (!canCommit || !repoPath) return
    // 记下发起提交的仓库：提交过程中切换仓库时，只清空被提交仓库的草稿
    const committedRepo = repoPath
    setSubmitting(true)
    try {
      const ok = await commit(summary.trim(), description.trim() || undefined)
      if (ok) clear(committedRepo)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="commit-panel">
      <input
        className="ui-input"
        aria-label="提交摘要"
        placeholder="提交摘要（必填）"
        value={summary}
        onChange={(e) => update({ summary: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void handleCommit()
        }}
      />
      <textarea
        className="ui-input commit-textarea"
        aria-label="提交描述"
        rows={2}
        placeholder="详细描述（可选，Ctrl+Enter 提交）"
        value={description}
        onChange={(e) => update({ description: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void handleCommit()
        }}
      />
      <Button
        variant="primary"
        className="commit-submit"
        isDisabled={!canCommit}
        onPress={() => void handleCommit()}
      >
        {submitting ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
        {stagedCount > 0 ? `提交 ${stagedCount} 个文件` : '提交'}
      </Button>
      <span className="commit-hint" title={hint}>
        {hint}
      </span>
    </div>
  )
}

export default CommitPanel
