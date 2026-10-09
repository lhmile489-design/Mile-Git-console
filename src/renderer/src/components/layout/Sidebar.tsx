import React from 'react'
import {
  ActionButton,
  AlertDialog,
  DialogTrigger
} from '@adobe/react-spectrum'
import { Folder, FolderOpen, GitBranch, Plus, X } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import type { RepoItem } from '../../types/ipc'

interface RepoItemRowProps {
  repo: RepoItem
  isActive: boolean
}

function RepoItemRow({ repo, isActive }: RepoItemRowProps): React.ReactElement {
  const gitStatus = useAppStore((s) => s.gitStatus)
  const removeRepo = useAppStore((s) => s.removeRepo)
  const selectRepo = useAppStore((s) => s.selectRepo)

  return (
    <div
      className={`repo-item${isActive ? ' active' : ''}`}
      onClick={() => void selectRepo(repo.id)}
    >
      <Folder size={16} className="repo-item-icon" />
      <div className="repo-item-info">
        <span className="repo-item-name">{repo.name}</span>
        {isActive && gitStatus ? (
          <span className="repo-item-sub">
            <GitBranch size={11} />
            {gitStatus.branch}
          </span>
        ) : (
          <span className="repo-item-sub" title={repo.path}>
            {repo.path}
          </span>
        )}
      </div>
      {/* 移除确认弹窗：避免误点 */}
      <span onClick={(e) => e.stopPropagation()}>
        <DialogTrigger>
          <ActionButton
            isQuiet
            aria-label={`移除 ${repo.name}`}
            UNSAFE_className="icon-btn repo-item-remove"
          >
            <X size={12} />
          </ActionButton>
          <AlertDialog
            title="移除仓库"
            variant="destructive"
            primaryActionLabel="移除"
            cancelLabel="取消"
            onPrimaryAction={() => void removeRepo(repo.id)}
          >
            将从列表中移除「{repo.name}」，不会删除磁盘上的文件。确定要继续吗？
          </AlertDialog>
        </DialogTrigger>
      </span>
    </div>
  )
}

function Sidebar(): React.ReactElement {
  const repos = useAppStore((s) => s.repos)
  const activeRepoId = useAppStore((s) => s.activeRepoId)
  const importRepo = useAppStore((s) => s.importRepo)

  return (
    <div className="app-sidebar">
      <div className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-title">仓库列表</span>
          <button
            className="icon-btn"
            aria-label="导入仓库"
            title="导入仓库"
            onClick={() => void importRepo()}
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="sidebar-body">
          {repos.length === 0 ? (
            <div className="sidebar-empty">
              还没有仓库
              <br />
              点击下方按钮导入一个 Git 仓库
            </div>
          ) : (
            <div className="repo-list">
              {repos.map((repo) => (
                <RepoItemRow
                  key={repo.id}
                  repo={repo}
                  isActive={repo.id === activeRepoId}
                />
              ))}
            </div>
          )}
        </div>
        <div className="sidebar-footer">
          <button
            className="btn sidebar-import-btn"
            onClick={() => void importRepo()}
          >
            <FolderOpen size={14} />
            导入仓库
          </button>
        </div>
      </div>
    </div>
  )
}

export default Sidebar
