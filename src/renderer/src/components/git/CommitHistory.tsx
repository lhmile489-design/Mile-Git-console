import React from 'react'
import { GitCommitHorizontal, Loader2 } from 'lucide-react'
import { useAppStore, isHistoryLoading } from '../../store/appStore'
import { StatusBadge } from './StatusPanel'
import DiffViewer from './DiffViewer'
import Workspace from '../layout/Workspace'
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

function CommitRow({ commit }: { commit: CommitEntry }): React.ReactElement {
  const selectedCommitHash = useAppStore((s) => s.selectedCommitHash)
  const selectCommit = useAppStore((s) => s.selectCommit)
  const selected = selectedCommitHash === commit.hash

  return (
    <div
      className={`commit-row${selected ? ' selected' : ''}`}
      onClick={() => void selectCommit(commit.hash)}
    >
      <div className="commit-graph">
        <span className="commit-graph-line" />
        <span className="commit-graph-dot" />
      </div>
      <div className="commit-row-info">
        <span className="commit-message" title={commit.message}>
          {commit.message}
        </span>
        <span className="commit-meta">
          <span className="commit-hash">{commit.shortHash}</span>
          <span>{commit.author}</span>
          <span>·</span>
          <span>{formatRelativeTime(commit.date)}</span>
        </span>
      </div>
      {commit.tags && commit.tags.length > 0 && (
        <span className="commit-tags">
          {commit.tags.map((tag) => (
            <span key={tag} className="commit-tag">
              {tag}
            </span>
          ))}
        </span>
      )}
    </div>
  )
}

function CommitDetailPanel(): React.ReactElement {
  const commitDetail = useAppStore((s) => s.commitDetail)
  const commitDetailError = useAppStore((s) => s.commitDetailError)
  const isLoadingDetail = useAppStore((s) => s.loading.isLoadingDetail)
  const selectedCommitFilePath = useAppStore((s) => s.selectedCommitFilePath)
  const selectCommitFile = useAppStore((s) => s.selectCommitFile)

  if (isLoadingDetail) {
    return (
      <div className="commit-detail">
        <div className="empty-state">
          <Loader2 size={24} className="spin" />
          <span>加载提交详情…</span>
        </div>
      </div>
    )
  }

  if (commitDetailError) {
    return (
      <div className="commit-detail">
        <div className="empty-state">
          <GitCommitHorizontal size={32} />
          <span style={{ color: 'var(--color-danger)' }}>加载失败：{commitDetailError}</span>
        </div>
      </div>
    )
  }

  if (!commitDetail) {
    return (
      <div className="commit-detail">
        <div className="empty-state">
          <GitCommitHorizontal size={32} />
          <span>选择提交查看详情</span>
        </div>
      </div>
    )
  }

  return (
    <div className="commit-detail">
      <div className="commit-detail-header">
        <div className="commit-detail-message">{commitDetail.message}</div>
        <div className="commit-detail-meta-row">
          <div className="commit-detail-author">
            <span className="commit-avatar">
              {commitDetail.author.slice(0, 1).toUpperCase()}
            </span>
            <span>
              {commitDetail.author} 提交于 {formatDateTime(commitDetail.date)}
            </span>
          </div>
          <div className="commit-detail-stats">
            <span className="stat-add">+{commitDetail.additions}</span>
            <span className="stat-del">−{commitDetail.deletions}</span>
            <span className="stat-hash">{commitDetail.shortHash}</span>
          </div>
        </div>
      </div>
      <div className="commit-file-list">
        {commitDetail.files.map((f) => (
          <div
            key={f.path}
            className={`commit-file-row${selectedCommitFilePath === f.path ? ' selected' : ''}`}
            onClick={() => void selectCommitFile(f.path)}
          >
            <StatusBadge status={f.status} />
            <span className="commit-file-path" title={f.oldPath ? `${f.oldPath} → ${f.path}` : f.path}>
              {f.path}
            </span>
            <span className="commit-file-stats">
              <span className="stat-add">+{f.additions}</span>
              <span className="stat-del">−{f.deletions}</span>
            </span>
          </div>
        ))}
      </div>
      <DiffViewer />
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
          <GitCommitHorizontal size={32} />
          <span>暂无提交记录</span>
        </div>
      ) : (
        commits.map((c) => <CommitRow key={c.hash} commit={c} />)
      )}
      {loadingHistory && (
        <div className="empty-state">
          <Loader2 size={20} className="spin" />
        </div>
      )}
      {commitsHasMore && !loadingHistory && (
        <div className="load-more-wrap">
          <button className="btn" onClick={() => void loadHistory(true)}>
            加载更多
          </button>
        </div>
      )}
    </div>
  )

  const detail = selectedCommitHash ? (
    <CommitDetailPanel />
  ) : (
    <div className="commit-detail">
      <div className="empty-state">
        <GitCommitHorizontal size={32} />
        <span>选择左侧提交查看详情</span>
      </div>
    </div>
  )

  return <Workspace list={list} detail={detail} listLabel="提交列表" detailLabel="提交详情" />
}

export default CommitHistory
