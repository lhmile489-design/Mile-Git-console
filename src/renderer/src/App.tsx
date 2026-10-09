import React, { useEffect } from 'react'
import { FolderOpen, GitFork, History, List, RefreshCw, X } from 'lucide-react'
import { useAppStore, useActiveRepo, isStatusLoading } from './store/appStore'
import Titlebar from './components/layout/Titlebar'
import Sidebar from './components/layout/Sidebar'
import BranchSelector from './components/git/BranchSelector'
import ActionBar from './components/git/ActionBar'
import StatusPanel from './components/git/StatusPanel'
import CommitPanel from './components/git/CommitPanel'
import CommitHistory from './components/git/CommitHistory'
import DiffViewer from './components/git/DiffViewer'

function FeedbackBars(): React.ReactElement | null {
  const error = useAppStore((s) => s.error)
  const notice = useAppStore((s) => s.notice)
  const clearFeedback = useAppStore((s) => s.clearFeedback)

  // notice 3 秒后自动消失
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => clearFeedback(), 3000)
    return () => clearTimeout(timer)
  }, [notice, clearFeedback])

  if (!error && !notice) return null

  return (
    <>
      {error && (
        <div className="feedback-bar feedback-bar-error">
          <span className="feedback-bar-text" title={error}>
            {error}
          </span>
          <button className="icon-btn" aria-label="关闭" onClick={clearFeedback}>
            <X size={14} />
          </button>
        </div>
      )}
      {notice && (
        <div className="feedback-bar feedback-bar-notice">
          <span className="feedback-bar-text" title={notice}>
            {notice}
          </span>
          <button className="icon-btn" aria-label="关闭" onClick={clearFeedback}>
            <X size={14} />
          </button>
        </div>
      )}
    </>
  )
}

function Welcome(): React.ReactElement {
  const importRepo = useAppStore((s) => s.importRepo)
  return (
    <div className="welcome">
      <GitFork size={56} strokeWidth={1.2} />
      <span className="welcome-text">导入一个 Git 仓库开始使用</span>
      <button className="btn btn-primary" onClick={() => void importRepo()}>
        <FolderOpen size={14} />
        导入仓库
      </button>
    </div>
  )
}

function Toolbar({ repoName }: { repoName: string }): React.ReactElement {
  const mainView = useAppStore((s) => s.mainView)
  const setMainView = useAppStore((s) => s.setMainView)
  const refreshStatus = useAppStore((s) => s.refreshStatus)
  const loadingStatus = isStatusLoading(useAppStore((s) => s.loading))

  return (
    <div className="toolbar">
      <span className="toolbar-repo-name">{repoName}</span>
      <BranchSelector />
      <ActionBar />
      <div className="toolbar-spacer" />
      <div className="segmented">
        <button
          className={`segmented-item${mainView === 'changes' ? ' active' : ''}`}
          onClick={() => setMainView('changes')}
        >
          <List size={13} />
          更改
        </button>
        <button
          className={`segmented-item${mainView === 'history' ? ' active' : ''}`}
          onClick={() => setMainView('history')}
        >
          <History size={13} />
          历史
        </button>
      </div>
      <button
        className="icon-btn"
        aria-label="刷新状态"
        title="刷新状态"
        onClick={() => void refreshStatus()}
      >
        <RefreshCw size={15} className={loadingStatus ? 'spin' : undefined} />
      </button>
    </div>
  )
}

function App(): React.ReactElement {
  const init = useAppStore((s) => s.init)
  const mainView = useAppStore((s) => s.mainView)
  const activeRepo = useActiveRepo()

  useEffect(() => {
    void init()
  }, [init])

  return (
    <>
      <Titlebar />
      <div className="app-layout">
        <Sidebar />
        <div className="app-main">
          {activeRepo ? (
            <>
              <Toolbar repoName={activeRepo.name} />
              <FeedbackBars />
              {mainView === 'changes' ? (
                <>
                  <div className="changes-layout">
                    <StatusPanel />
                    <DiffViewer />
                  </div>
                  <CommitPanel />
                </>
              ) : (
                <CommitHistory />
              )}
            </>
          ) : (
            <Welcome />
          )}
        </div>
      </div>
    </>
  )
}

export default App
