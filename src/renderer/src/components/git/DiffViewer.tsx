// Diff 卡片：卡片头（路径 + 增删统计 + 暂存操作）+ 凹陷代码区
// worktree 模式用于变更视图，显示暂存 / 取消暂存；commit 模式用于提交历史，只读
import React from 'react'
import { FileText, Minus, Plus } from 'lucide-react'
import { useAppStore, isDiffLoading } from '../../store/appStore'
import { Button, Skeleton } from '../common'

interface DiffViewerProps {
  mode?: 'worktree' | 'commit'
}

function EmptyDiff({ icon, title, text }: { icon: React.ReactNode; title: string; text?: string }): React.ReactElement {
  return (
    <div className="diff-viewer">
      <div className="empty-state">
        <span className="empty-state-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="empty-state-title">{title}</span>
        {text && <span>{text}</span>}
      </div>
    </div>
  )
}

function DiffViewer({ mode = 'worktree' }: DiffViewerProps): React.ReactElement {
  const diff = useAppStore((s) => s.diff)
  const loading = isDiffLoading(useAppStore((s) => s.loading))
  const selectedFile = useAppStore((s) => s.selectedFile)
  const stage = useAppStore((s) => s.stage)
  const unstage = useAppStore((s) => s.unstage)

  if (loading) {
    return (
      <div className="diff-viewer">
        <div className="diff-well">
          <Skeleton rows={12} variant="code" label="正在读取差异" />
        </div>
      </div>
    )
  }
  if (!diff) {
    return (
      <EmptyDiff
        icon={<FileText size={20} />}
        title="选择文件查看变更"
        text={mode === 'worktree' ? '在左侧列表中点击一个文件' : '在上方文件列表中点击一个文件'}
      />
    )
  }

  const additions = diff.hunks.reduce(
    (n, h) => n + h.lines.filter((l) => l.type === 'added').length,
    0
  )
  const deletions = diff.hunks.reduce(
    (n, h) => n + h.lines.filter((l) => l.type === 'removed').length,
    0
  )
  const showStageAction =
    mode === 'worktree' && selectedFile !== null && selectedFile.path === diff.filePath

  const header = (
    <div className="diff-header">
      <span className="diff-header-path" title={diff.filePath}>
        {diff.filePath}
      </span>
      {!diff.isBinary && (
        <span className="diff-stats">
          <span className="stat-add">+{additions}</span>
          <span className="stat-del">−{deletions}</span>
        </span>
      )}
      {showStageAction && (
        <Button
          size="sm"
          variant="secondary"
          className="diff-header-action"
          onPress={() =>
            void (selectedFile.staged ? unstage([diff.filePath]) : stage([diff.filePath]))
          }
        >
          {selectedFile.staged ? <Minus size={14} /> : <Plus size={14} />}
          {selectedFile.staged ? '取消暂存' : '暂存'}
        </Button>
      )}
    </div>
  )

  const body = diff.isBinary ? (
    <div className="empty-state">
      <span className="empty-state-icon" aria-hidden="true">
        <FileText size={20} />
      </span>
      <span className="empty-state-title">二进制文件</span>
      <span>无法以文本形式显示差异</span>
    </div>
  ) : diff.hunks.length === 0 ? (
    <div className="empty-state">
      <span className="empty-state-title">没有可显示的变更</span>
    </div>
  ) : (
    <div className="diff-scroll selectable">
      {diff.hunks.map((hunk, hi) => (
        <div key={hi} className="diff-hunk">
          <div className="diff-hunk-header">
            <span className="diff-hunk-pill">{hunk.header}</span>
          </div>
          {hunk.lines.map((line, li) => (
            <div key={li} className={`diff-line ${line.type}`}>
              <span className="diff-line-no">
                {line.type === 'added' ? '' : (line.oldLineNo ?? '')}
              </span>
              <span className="diff-line-no">
                {line.type === 'removed' ? '' : (line.newLineNo ?? '')}
              </span>
              <span className="diff-line-sign" aria-hidden="true">
                {line.type === 'added' ? '+' : line.type === 'removed' ? '−' : ' '}
              </span>
              <span className="diff-line-content">{line.content}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )

  return (
    <div className="diff-viewer">
      {header}
      <div className="diff-well">{body}</div>
    </div>
  )
}

export default DiffViewer
