import React, { useEffect } from 'react'
import {
  CircleAlert,
  CircleCheck,
  FolderOpen,
  GitFork,
  History,
  List,
  RefreshCw,
  X
} from 'lucide-react'
import { useAppStore, useActiveRepo, isStatusLoading } from './store/appStore'
import Titlebar from './components/layout/Titlebar'
import Sidebar from './components/layout/Sidebar'
import BranchSelector from './components/git/BranchSelector'
import ActionBar from './components/git/ActionBar'
import StatusPanel from './components/git/StatusPanel'
import CommitPanel from './components/git/CommitPanel'
import CommitHistory from './components/git/CommitHistory'
import DiffViewer from './components/git/DiffViewer'
import SettingsPage from './pages/SettingsPage'
import Workspace from './components/layout/Workspace'
import { useFocusRefresh } from './hooks/useFocusRefresh'
import { Button, IconButton, Panel, Segmented } from './components/common'

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

  // 浮在右下角的提示卡片：错误需手动关闭，普通提示 3 秒后自动消失
  return (
    <div className="toast-stack">
      {error && (
        <div className="toast toast-error" role="alert">
          <span className="toast-icon" aria-hidden="true">
            <CircleAlert size={16} />
          </span>
          <span className="toast-text selectable" title={error}>
            {error}
          </span>
          <IconButton label="关闭提示" size="sm" onPress={clearFeedback}>
            <X size={14} />
          </IconButton>
        </div>
      )}
      {notice && (
        <div className="toast toast-notice" role="status">
          <span className="toast-icon" aria-hidden="true">
            <CircleCheck size={16} />
          </span>
          <span className="toast-text" title={notice}>
            {notice}
          </span>
          <IconButton label="关闭提示" size="sm" onPress={clearFeedback}>
            <X size={14} />
          </IconButton>
        </div>
      )}
    </div>
  )
}

function Welcome(): React.ReactElement {
  const importRepo = useAppStore((s) => s.importRepo)
  return (
    <div className="welcome">
      <Panel as="section" className="welcome-card" aria-labelledby="welcome-title">
        <span className="welcome-mark" aria-hidden="true">
          <GitFork size={32} />
        </span>
        <h1 id="welcome-title" className="welcome-title">
          开始管理你的仓库
        </h1>
        <p className="welcome-text">导入一个本地 Git 仓库，查看变更、提交、切换分支和同步远端。</p>
        <Button variant="primary" onPress={() => void importRepo()}>
          <FolderOpen size={16} />
          导入仓库
        </Button>
      </Panel>
    </div>
  )
}

function Toolbar({ repoName }: { repoName: string }): React.ReactElement {
  const mainView = useAppStore((s) => s.mainView)
  const setMainView = useAppStore((s) => s.setMainView)
  const refreshStatus = useAppStore((s) => s.refreshStatus)
  const loadingStatus = isStatusLoading(useAppStore((s) => s.loading))

  return (
    <Panel className="toolbar">
      <span className="toolbar-repo-name">{repoName}</span>
      <BranchSelector />
      <ActionBar />
      <div className="toolbar-spacer" />
      <Segmented
        aria-label="视图切换"
        value={mainView}
        onChange={setMainView}
        options={[
          { id: 'changes', label: '更改', icon: <List size={16} /> },
          { id: 'history', label: '历史', icon: <History size={16} /> }
        ]}
      />
      <IconButton label="刷新状态" onPress={() => void refreshStatus()}>
        <RefreshCw size={16} className={loadingStatus ? 'spin' : undefined} />
      </IconButton>
    </Panel>
  )
}

function MainLayout(): React.ReactElement {
  const activeRepo = useActiveRepo()
  const mainView = useAppStore((s) => s.mainView)

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        {activeRepo ? (
          <>
            <Toolbar repoName={activeRepo.name} />
            {mainView === 'changes' ? (
              <Workspace
                listLabel="文件变更"
                detailLabel="文件差异"
                list={
                  <div className="changes-list">
                    <StatusPanel />
                    <CommitPanel />
                  </div>
                }
                detail={<DiffViewer />}
              />
            ) : (
              <CommitHistory />
            )}
          </>
        ) : (
          <Welcome />
        )}
      </div>
    </div>
  )
}

function App(): React.ReactElement {
  const init = useAppStore((s) => s.init)
  const view = useAppStore((s) => s.view)

  useEffect(() => {
    void init()
  }, [init])

  useFocusRefresh()

  return (
    <>
      <Titlebar />
      {view === 'settings' ? <SettingsPage /> : <MainLayout />}
      <FeedbackBars />
    </>
  )
}

export default App
