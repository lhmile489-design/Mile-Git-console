// 提交草稿按仓库保存：切换仓库不串内容，重启应用后仍在；只有提交成功才清空
import { useCallback, useEffect, useState } from 'react'

export interface CommitDraft {
  summary: string
  description: string
}

const STORAGE_KEY = 'commitDrafts'
const EMPTY: CommitDraft = { summary: '', description: '' }

function readAll(): Record<string, CommitDraft> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    const out: Record<string, CommitDraft> = {}
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v !== 'object' || v === null) continue
      const d = v as Record<string, unknown>
      out[k] = {
        summary: typeof d.summary === 'string' ? d.summary : '',
        description: typeof d.description === 'string' ? d.description : ''
      }
    }
    return out
  } catch {
    // 存储内容损坏时当作没有草稿
    return {}
  }
}

function writeDraft(repoPath: string, draft: CommitDraft): void {
  const all = readAll()
  if (!draft.summary && !draft.description) delete all[repoPath]
  else all[repoPath] = draft
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    // 存储写满等情况下放弃保存，不影响输入
  }
}

export function useCommitDraft(repoPath: string | null): {
  draft: CommitDraft
  update: (patch: Partial<CommitDraft>) => void
  clear: (forRepo: string) => void
} {
  const [draft, setDraft] = useState<CommitDraft>(EMPTY)

  // 切换仓库时载入该仓库的草稿
  useEffect(() => {
    setDraft(repoPath ? (readAll()[repoPath] ?? EMPTY) : EMPTY)
  }, [repoPath])

  const update = useCallback(
    (patch: Partial<CommitDraft>) => {
      setDraft((prev) => {
        const next = { ...prev, ...patch }
        if (repoPath) writeDraft(repoPath, next)
        return next
      })
    },
    [repoPath]
  )

  // 清空指定仓库的草稿；如果它仍是当前仓库，界面同步清空
  const clear = useCallback(
    (forRepo: string) => {
      writeDraft(forRepo, EMPTY)
      if (forRepo === repoPath) setDraft(EMPTY)
    },
    [repoPath]
  )

  return { draft, update, clear }
}
