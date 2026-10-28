import React, { useEffect } from 'react'
import {
  FolderOpen,
  GitFork,
  History,
  List,
  RefreshCw
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
import ToastStack from './components/layout/ToastStack'
import CommandPalette from './components/layout/CommandPalette'
import { useFocusRefresh } from './hooks/useFocusRefresh'
import { useShortcuts } from './hooks/useShortcuts'
import { useFolderDrop } from './hooks/useFolderDrop'
import { usePresence } from './hooks/usePresence'
import { shortcutHint } from './commands/registry'
import { Button, IconButton, Panel, Segmented } from './components/common'

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
      <IconButton label="刷新状态" hint={shortcutHint('status.refresh')} onPress={() => void refreshStatus()}>
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
  useShortcuts()
  const dragging = useFolderDrop()
  const dropPresence = usePresence(dragging, 150)

  return (
    <>
      <Titlebar />
      {view === 'settings' ? <SettingsPage /> : <MainLayout />}
      <ToastStack />
      <CommandPalette />
      {dropPresence.mounted && (
        <div className="drop-overlay" aria-hidden="true" data-state={dropPresence.state}>
          <div className="drop-overlay-card">
            <FolderOpen size={32} />
            <span className="drop-overlay-title">松开即可导入仓库</span>
            <span className="drop-overlay-text">支持一次拖入多个 Git 仓库文件夹</span>
          </div>
        </div>
      )}
    </>
  )
}

export default App
