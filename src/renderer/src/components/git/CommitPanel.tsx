import React, { useState } from 'react'
import { Check } from 'lucide-react'
import { useAppStore } from '../../store/appStore'

function CommitPanel(): React.ReactElement {
  const gitStatus = useAppStore((s) => s.gitStatus)
  const commit = useAppStore((s) => s.commit)

  const [summary, setSummary] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const stagedCount = (gitStatus?.files ?? []).filter((f) => f.staged).length
  const branch = gitStatus?.branch ?? ''
  const canCommit = summary.trim().length > 0 && stagedCount > 0 && !submitting

  const handleCommit = async (): Promise<void> => {
    if (!canCommit) return
    setSubmitting(true)
    try {
      const ok = await commit(summary.trim(), description.trim() || undefined)
      if (ok) {
        setSummary('')
        setDescription('')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="commit-panel">
      <input
        className="commit-input"
        placeholder="摘要（必填）"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void handleCommit()
        }}
      />
      <textarea
        className="commit-textarea"
        rows={3}
        placeholder="描述（可选）"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="commit-footer">
        <span className="commit-staged-count">{stagedCount} 个文件已暂存</span>
        <button
          className="btn btn-primary"
          disabled={!canCommit}
          onClick={() => void handleCommit()}
        >
          <Check size={14} />
          提交到 {branch}
        </button>
      </div>
    </div>
  )
}

export default CommitPanel
