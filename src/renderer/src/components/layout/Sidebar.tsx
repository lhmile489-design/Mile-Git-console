import React, { useRef, useState } from 'react'
import { Folder, FolderOpen, FolderSearch, GitBranch, Plus, Search, TriangleAlert, X } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { Button, ConfirmDialog, IconButton, Panel, SelectionIndicator } from '../common'
import type { RepoItem } from '../../types/ipc'

interface RepoItemRowProps {
  repo: RepoItem
  isActive: boolean
}

function RepoItemRow({ repo, isActive }: RepoItemRowProps): React.ReactElement {
  const gitStatus = useAppStore((s) => s.gitStatus)
  const removeRepo = useAppStore((s) => s.removeRepo)
  const selectRepo = useAppStore((s) => s.selectRepo)
  const relocateRepo = useAppStore((s) => s.relocateRepo)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const missing = repo.missing === true

  return (
    <div className={`repo-item${isActive ? ' active' : ''}${missing ? ' is-missing' : ''}`}>
      {/* 选中区域与移除按钮是兄弟节点，避免按钮嵌套按钮 */}
      <button
        className="repo-item-main"
        aria-current={isActive ? 'true' : undefined}
        onClick={() => void selectRepo(repo.id)}
      >
        {missing ? (
          <TriangleAlert size={16} className="repo-item-icon" aria-hidden="true" />
        ) : (
          <Folder size={16} className="repo-item-icon" />
        )}
        <span className="repo-item-info">
          <span className="repo-item-name">{repo.name}</span>
          {missing ? (
            <span className="repo-item-sub repo-item-missing" title={repo.path}>
              目录不存在
            </span>
          ) : isActive && gitStatus ? (
            <span className="repo-item-sub">
              <GitBranch size={12} />
              {gitStatus.branch}
            </span>
          ) : (
            <span className="repo-item-sub" title={repo.path}>
              {repo.path}
            </span>
          )}
        </span>
      </button>
      {missing && (
        <IconButton
          label={`重新定位 ${repo.name}`}
          size="sm"
          className="repo-item-relocate"
          onPress={() => void relocateRepo(repo.id)}
        >
          <FolderSearch size={14} />
        </IconButton>
      )}
      <IconButton
        label={`移除 ${repo.name}`}
        size="sm"
        className="repo-item-remove"
        onPress={() => setConfirmRemove(true)}
      >
        <X size={14} />
      </IconButton>
      <ConfirmDialog
        isOpen={confirmRemove}
        onOpenChange={setConfirmRemove}
        title="移除仓库"
        confirmLabel="移除"
        onConfirm={() => void removeRepo(repo.id)}
      >
        将从列表中移除「{repo.name}」，不会删除磁盘上的文件。确定要继续吗？
      </ConfirmDialog>
    </div>
  )
}

function Sidebar(): React.ReactElement {
  const repos = useAppStore((s) => s.repos)
  const activeRepoId = useAppStore((s) => s.activeRepoId)
  const importRepo = useAppStore((s) => s.importRepo)
  const [query, setQuery] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = query.trim()
    ? repos.filter((r) => r.name.toLowerCase().includes(query.trim().toLowerCase()))
    : repos

  return (
    <Panel as="aside" className="app-sidebar" aria-label="仓库列表">
      <div className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-title">仓库</span>
          {repos.length > 0 && <span className="count-badge">{repos.length}</span>}
          <IconButton label="导入仓库" className="sidebar-header-add" onPress={() => void importRepo()}>
            <Plus size={16} />
          </IconButton>
        </div>
        <div className="sidebar-search">
          <Search size={14} className="sidebar-search-icon" />
          <input
            className="ui-input sidebar-search-input"
            type="text"
            aria-label="搜索仓库"
            placeholder="搜索仓库…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <IconButton
              label="清除搜索"
              size="sm"
              className="sidebar-search-clear"
              onPress={() => setQuery('')}
            >
              <X size={14} />
            </IconButton>
          )}
        </div>
        <div className="sidebar-body">
          {repos.length === 0 ? (
            <div className="sidebar-empty">
              还没有仓库
              <br />
              点击下方按钮导入一个 Git 仓库
            </div>
          ) : filtered.length === 0 ? (
            <div className="sidebar-empty">无匹配仓库</div>
          ) : (
            <div className="repo-list" ref={listRef}>
              <SelectionIndicator containerRef={listRef} selector=".repo-item.active" watch={activeRepoId} />
              {filtered.map((repo) => (
                <RepoItemRow key={repo.id} repo={repo} isActive={repo.id === activeRepoId} />
              ))}
            </div>
          )}
        </div>
        <div className="sidebar-footer">
          <Button variant="secondary" className="sidebar-import-btn" onPress={() => void importRepo()}>
            <FolderOpen size={16} />
            导入仓库
          </Button>
        </div>
      </div>
    </Panel>
  )
}

export default Sidebar
