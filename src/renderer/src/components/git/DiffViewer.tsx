import React from 'react'
import { FileText, Loader2 } from 'lucide-react'
import { useAppStore, isDiffLoading } from '../../store/appStore'

function DiffViewer(): React.ReactElement {
  const diff = useAppStore((s) => s.diff)
  const loading = isDiffLoading(useAppStore((s) => s.loading))

  if (loading) {
    return (
      <div className="diff-viewer">
        <div className="empty-state">
          <Loader2 size={24} className="spin" />
          <span>加载中…</span>
        </div>
      </div>
    )
  }

  if (!diff) {
    return (
      <div className="diff-viewer">
        <div className="empty-state">
          <FileText size={32} />
          <span>选择文件查看变更</span>
        </div>
      </div>
    )
  }

  if (diff.isBinary) {
    return (
      <div className="diff-viewer">
        <div className="empty-state">
          <FileText size={32} />
          <span>二进制文件无法显示</span>
        </div>
      </div>
    )
  }

  if (diff.hunks.length === 0) {
    return (
      <div className="diff-viewer">
        <div className="empty-state">
          <FileText size={32} />
          <span>没有可显示的变更</span>
        </div>
      </div>
    )
  }

  return (
    <div className="diff-viewer">
      <div className="diff-scroll">
        {diff.hunks.map((hunk, hi) => (
          <div key={hi}>
            <div className="diff-hunk-header">{hunk.header}</div>
            {hunk.lines.map((line, li) => (
              <div key={li} className={`diff-line ${line.type}`}>
                <span className="diff-line-no">
                  {line.type === 'added' ? '' : (line.oldLineNo ?? '')}
                </span>
                <span className="diff-line-no">
                  {line.type === 'removed' ? '' : (line.newLineNo ?? '')}
                </span>
                <span className="diff-line-content">
                  <span className="diff-line-sign">
                    {line.type === 'added' ? '+' : line.type === 'removed' ? '−' : ' '}
                  </span>
                  {line.content}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default DiffViewer
