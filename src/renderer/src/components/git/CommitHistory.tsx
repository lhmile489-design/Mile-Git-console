// 提交历史：左侧提交列表卡片 + 右侧详情卡片（摘要区、文件列表、只读 diff）
import React from 'react'
import { AlertTriangle, GitCommitHorizontal, Loader2 } from 'lucide-react'
import { useAppStore, isHistoryLoading } from '../../store/appStore'
import { StatusBadge } from './StatusPanel'
import DiffViewer from './DiffViewer'
import Workspace from '../layout/Workspace'
import { Button } from '../common'
import type { CommitEntry } from '../../types/ipc'

function formatRelativeTime(dateStr: string): string {
  const time = new Date(dateStr).getTime()
  if (Number.isNaN(time)) return dateStr
  const diff = Date.now() - time
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (diff < minute) return '刚刚'
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`
  if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleString('zh-CN', { hour12: false })
}

function DetailEmpty({
  icon,
  title,
  text,
  danger = false
}: {
  icon: React.ReactNode
  title: string
  text?: string
  danger?: boolean
}): React.ReactElement {
  return (
    <div className="commit-detail">
      <div className="empty-state">
        <span className={`empty-state-icon${danger ? ' is-danger' : ''}`} aria-hidden="true">
          {icon}
        </span>
        <span className="empty-state-title">{title}</span>
        {text && <span className="empty-state-text">{text}</span>}
      </div>
    </div>
  )
}

function CommitRow({ commit }: { commit: CommitEntry }): React.ReactElement {
  const selectedCommitHash = useAppStore((s) => s.selectedCommitHash)
  const selectCommit = useAppStore((s) => s.selectCommit)
  const selected = selectedCommitHash === commit.hash

  return (
    <button
      className={`commit-row${selected ? ' selected' : ''}`}
      aria-current={selected ? 'true' : undefined}
      onClick={() => void selectCommit(commit.hash)}
    >
      <span className="commit-graph" aria-hidden="true">
        <span className="commit-graph-line" />
        <span className="commit-graph-dot" />
      </span>
      <span className="commit-row-info">
        <span className="commit-message" title={commit.message}>
          {commit.message}
        </span>
        <span className="commit-meta">
          <span className="commit-hash">{commit.shortHash}</span>
          <span>{commit.author}</span>
          <span aria-hidden="true">·</span>
          <span>{formatRelativeTime(commit.date)}</span>
        </span>
      </span>
      {commit.tags && commit.tags.length > 0 && (
        <span className="commit-tags">
          {commit.tags.map((tag) => (
            <span key={tag} className="commit-tag">
              {tag}
            </span>
          ))}
        </span>
      )}
    </button>
  )
}

function CommitDetailPanel(): React.ReactElement {
  const commitDetail = useAppStore((s) => s.commitDetail)
  const commitDetailError = useAppStore((s) => s.commitDetailError)
  const isLoadingDetail = useAppStore((s) => s.loading.isLoadingDetail)
  const selectedCommitFilePath = useAppStore((s) => s.selectedCommitFilePath)
  const selectCommitFile = useAppStore((s) => s.selectCommitFile)

  if (isLoadingDetail) {
    return <DetailEmpty icon={<Loader2 size={20} className="spin" />} title="加载提交详情…" />
  }
  if (commitDetailError) {
    return (
      <DetailEmpty
        icon={<AlertTriangle size={20} />}
        title="加载失败"
        text={commitDetailError}
        danger
      />
    )
  }
  if (!commitDetail) {
    return <DetailEmpty icon={<GitCommitHorizontal size={20} />} title="选择提交查看详情" />
  }

  return (
    <div className="commit-detail">
      <div className="commit-detail-header">
        <div className="commit-detail-message selectable">{commitDetail.message}</div>
        {commitDetail.description && (
          <div className="commit-detail-description selectable">{commitDetail.description}</div>
        )}
        <div className="commit-detail-meta-row">
          <div className="commit-detail-author">
            <span className="commit-avatar" aria-hidden="true">
              {commitDetail.author.slice(0, 1).toUpperCase()}
            </span>
            <span className="commit-detail-author-text">
              {commitDetail.author} 提交于 {formatDateTime(commitDetail.date)}
            </span>
          </div>
          <div className="commit-detail-stats">
            <span className="stat-add">+{commitDetail.additions}</span>
            <span className="stat-del">−{commitDetail.deletions}</span>
            <span className="stat-hash selectable">{commitDetail.shortHash}</span>
          </div>
        </div>
      </div>
      <div className="commit-file-list" aria-label="变更文件">
        {commitDetail.files.map((f) => {
          const selected = selectedCommitFilePath === f.path
          return (
            <button
              key={f.path}
              className={`commit-file-row${selected ? ' selected' : ''}`}
              aria-current={selected ? 'true' : undefined}
              title={f.oldPath ? `${f.oldPath} → ${f.path}` : f.path}
              onClick={() => void selectCommitFile(f.path)}
            >
              <StatusBadge status={f.status} />
              <span className="commit-file-path">{f.path}</span>
              <span className="commit-file-stats">
                <span className="stat-add">+{f.additions}</span>
                <span className="stat-del">−{f.deletions}</span>
              </span>
            </button>
          )
        })}
      </div>
      <DiffViewer mode="commit" />
    </div>
  )
}

function CommitHistory(): React.ReactElement {
  const commits = useAppStore((s) => s.commits)
  const commitsHasMore = useAppStore((s) => s.commitsHasMore)
  const loadingHistory = isHistoryLoading(useAppStore((s) => s.loading))
  const selectedCommitHash = useAppStore((s) => s.selectedCommitHash)
  const loadHistory = useAppStore((s) => s.loadHistory)

  const list = (
    <div className="commit-list">
      {commits.length === 0 && !loadingHistory ? (
        <div className="empty-state">
          <span className="empty-state-icon" aria-hidden="true">
            <GitCommitHorizontal size={20} />
          </span>
          <span className="empty-state-title">暂无提交记录</span>
        </div>
      ) : (
        commits.map((c) => <CommitRow key={c.hash} commit={c} />)
      )}
      {loadingHistory && (
        <div className="commit-list-loading">
          <Loader2 size={20} className="spin" />
        </div>
      )}
      {commitsHasMore && !loadingHistory && (
        <div className="load-more-wrap">
          <Button size="sm" variant="ghost" onPress={() => void loadHistory(true)}>
            加载更多
          </Button>
        </div>
      )}
    </div>
  )

  const detail = selectedCommitHash ? (
    <CommitDetailPanel />
  ) : (
    <DetailEmpty
      icon={<GitCommitHorizontal size={20} />}
      title="选择提交查看详情"
      text="在左侧列表中点击一条提交"
    />
  )

  return <Workspace list={list} detail={detail} listLabel="提交列表" detailLabel="提交详情" />
}

export default CommitHistory
