import React, { useMemo, useRef, useState } from 'react'
import {
  ChevronRight,
  Folder,
  FolderOpen,
  FolderPlus,
  FolderSearch,
  GitBranch,
  Pencil,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
  X
} from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { Button, ConfirmDialog, IconButton, Panel, SelectionIndicator } from '../common'
import { repoDisplayName, type RepoItem, type WorkspaceItem } from '../../types/ipc'
import RepoEditDialog from './RepoEditDialog'
import WorkspaceNameDialog from './WorkspaceNameDialog'

interface RepoItemRowProps {
  repo: RepoItem
  isActive: boolean
  onEdit: (repo: RepoItem) => void
}

function RepoItemRow({ repo, isActive, onEdit }: RepoItemRowProps): React.ReactElement {
  const gitStatus = useAppStore((s) => s.gitStatus)
  const removeRepo = useAppStore((s) => s.removeRepo)
  const selectRepo = useAppStore((s) => s.selectRepo)
  const relocateRepo = useAppStore((s) => s.relocateRepo)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const missing = repo.missing === true
  const displayName = repoDisplayName(repo)
  // 悬停提示带上目录名与备注：别名会盖住真实目录名，需要有地方能看到
  const tooltip = [repo.alias ? `目录名：${repo.name}` : null, repo.path, repo.note]
    .filter(Boolean)
    .join('\n')

  return (
    <div
      className={`repo-item${isActive ? ' active' : ''}${missing ? ' is-missing' : ''}`}
      title={tooltip}
    >
      {/* 选中区域与操作按钮是兄弟节点，避免按钮嵌套按钮 */}
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
          <span className="repo-item-name">{displayName}</span>
          {missing ? (
            <span className="repo-item-sub repo-item-missing">目录不存在</span>
          ) : isActive && gitStatus ? (
            <span className="repo-item-sub">
              <GitBranch size={12} />
              {gitStatus.branch}
            </span>
          ) : repo.note ? (
            <span className="repo-item-sub">{repo.note}</span>
          ) : (
            <span className="repo-item-sub">{repo.path}</span>
          )}
        </span>
      </button>
      {missing && (
        <IconButton
          label={`重新定位 ${displayName}`}
          size="sm"
          className="repo-item-relocate"
          onPress={() => void relocateRepo(repo.id)}
        >
          <FolderSearch size={14} />
        </IconButton>
      )}
      <IconButton
        label={`编辑 ${displayName}`}
        size="sm"
        className="repo-item-action"
        onPress={() => onEdit(repo)}
      >
        <Pencil size={14} />
      </IconButton>
      <IconButton
        label={`移除 ${displayName}`}
        size="sm"
        className="repo-item-action repo-item-remove"
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
        将从列表中移除「{displayName}」，不会删除磁盘上的文件。确定要继续吗？
      </ConfirmDialog>
    </div>
  )
}

interface WorkspaceGroupProps {
  workspace: WorkspaceItem | null // null 表示「未分组」
  repos: RepoItem[]
  activeRepoId: number | null
  forceOpen: boolean
  onEditRepo: (repo: RepoItem) => void
  onRename: (ws: WorkspaceItem) => void
  onDelete: (ws: WorkspaceItem) => void
}

function WorkspaceGroup({
  workspace,
  repos,
  activeRepoId,
  forceOpen,
  onEditRepo,
  onRename,
  onDelete
}: WorkspaceGroupProps): React.ReactElement {
  const toggleWorkspace = useAppStore((s) => s.toggleWorkspace)
  // 搜索时全部展开，不然命中的仓库会藏在折叠的分组里
  const collapsed = workspace !== null && workspace.collapsed && !forceOpen
  const title = workspace ? workspace.name : '未分组'

  return (
    <section className="ws-group" aria-label={title}>
      <div className="ws-header">
        {workspace ? (
          <button
            className="ws-toggle"
            aria-expanded={!collapsed}
            onClick={() => void toggleWorkspace(workspace.id)}
          >
            <ChevronRight size={14} className={`ws-chevron${collapsed ? '' : ' is-open'}`} />
            <span className="ws-name">{title}</span>
            <span className="ws-count">{repos.length}</span>
          </button>
        ) : (
          <span className="ws-toggle is-static">
            <span className="ws-name">{title}</span>
            <span className="ws-count">{repos.length}</span>
          </span>
        )}
        {workspace && (
          <span className="ws-actions">
            <IconButton label={`重命名 ${title}`} size="sm" onPress={() => onRename(workspace)}>
              <Pencil size={14} />
            </IconButton>
            <IconButton label={`删除工作区 ${title}`} size="sm" onPress={() => onDelete(workspace)}>
              <Trash2 size={14} />
            </IconButton>
          </span>
        )}
      </div>
      {!collapsed &&
        repos.map((repo) => (
          <RepoItemRow
            key={repo.id}
            repo={repo}
            isActive={repo.id === activeRepoId}
            onEdit={onEditRepo}
          />
        ))}
    </section>
  )
}

function matches(repo: RepoItem, q: string): boolean {
  return [repo.name, repo.alias, repo.note, repo.path].some((v) => v?.toLowerCase().includes(q))
}

function Sidebar(): React.ReactElement {
  const repos = useAppStore((s) => s.repos)
  const workspaces = useAppStore((s) => s.workspaces)
  const activeRepoId = useAppStore((s) => s.activeRepoId)
  const importRepo = useAppStore((s) => s.importRepo)
  const createWorkspace = useAppStore((s) => s.createWorkspace)
  const renameWorkspace = useAppStore((s) => s.renameWorkspace)
  const deleteWorkspace = useAppStore((s) => s.deleteWorkspace)
  const [query, setQuery] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  // 对话框的开关与内容分开存：关闭动画期间内容不能立刻清空
  const [editRepo, setEditRepo] = useState<RepoItem | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [nameDialog, setNameDialog] = useState<{ mode: 'create' | 'rename'; ws: WorkspaceItem | null }>({
    mode: 'create',
    ws: null
  })
  const [nameOpen, setNameOpen] = useState(false)
  const [deleting, setDeleting] = useState<WorkspaceItem | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const q = query.trim().toLowerCase()
  const searching = q.length > 0

  const groups = useMemo(() => {
    const visible = searching ? repos.filter((r) => matches(r, q)) : repos
    const byWs = new Map<number | null, RepoItem[]>()
    for (const r of visible) {
      // 仓库指向了已不存在的工作区时，按未分组处理
      const key = r.workspaceId !== null && workspaces.some((w) => w.id === r.workspaceId) ? r.workspaceId : null
      const list = byWs.get(key) ?? []
      list.push(r)
      byWs.set(key, list)
    }
    return { visibleCount: visible.length, byWs }
  }, [repos, workspaces, q, searching])

  const ungrouped = groups.byWs.get(null) ?? []
  // 搜索时隐藏空分组；平时保留，这样刚建好的空工作区也看得到
  const shownWorkspaces = workspaces.filter((w) => !searching || (groups.byWs.get(w.id)?.length ?? 0) > 0)

  const openEdit = (repo: RepoItem): void => {
    setEditRepo(repo)
    setEditOpen(true)
  }
  const openCreate = (): void => {
    setNameDialog({ mode: 'create', ws: null })
    setNameOpen(true)
  }
  const openRename = (ws: WorkspaceItem): void => {
    setNameDialog({ mode: 'rename', ws })
    setNameOpen(true)
  }
  const openDelete = (ws: WorkspaceItem): void => {
    setDeleting(ws)
    setDeleteOpen(true)
  }

  return (
    <Panel as="aside" className="app-sidebar" aria-label="仓库列表">
      <div className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-title">仓库</span>
          {repos.length > 0 && <span className="count-badge">{repos.length}</span>}
          <span className="sidebar-header-tools">
            <IconButton label="新建工作区" onPress={openCreate}>
              <FolderPlus size={16} />
            </IconButton>
            <IconButton label="导入仓库" onPress={() => void importRepo()}>
              <Plus size={16} />
            </IconButton>
          </span>
        </div>
        <div className="sidebar-search">
          <Search size={14} className="sidebar-search-icon" />
          <input
            className="ui-input sidebar-search-input"
            type="text"
            aria-label="搜索仓库"
            placeholder="搜索仓库、别名…"
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
          {repos.length === 0 && workspaces.length === 0 ? (
            <div className="sidebar-empty">
              还没有仓库
              <br />
              点击下方按钮导入一个 Git 仓库
            </div>
          ) : searching && groups.visibleCount === 0 ? (
            <div className="sidebar-empty">无匹配仓库</div>
          ) : (
            <div className="repo-list" ref={listRef}>
              <SelectionIndicator
                containerRef={listRef}
                selector=".repo-item.active"
                watch={`${activeRepoId}|${workspaces.map((w) => `${w.id}${w.collapsed ? 'c' : 'o'}`).join()}`}
              />
              {shownWorkspaces.map((w) => (
                <WorkspaceGroup
                  key={w.id}
                  workspace={w}
                  repos={groups.byWs.get(w.id) ?? []}
                  activeRepoId={activeRepoId}
                  forceOpen={searching}
                  onEditRepo={openEdit}
                  onRename={openRename}
                  onDelete={openDelete}
                />
              ))}
              {/* 没有任何工作区时不显示「未分组」标题，列表和以前一样平铺 */}
              {ungrouped.length > 0 &&
                (workspaces.length === 0 ? (
                  ungrouped.map((repo) => (
                    <RepoItemRow
                      key={repo.id}
                      repo={repo}
                      isActive={repo.id === activeRepoId}
                      onEdit={openEdit}
                    />
                  ))
                ) : (
                  <WorkspaceGroup
                    workspace={null}
                    repos={ungrouped}
                    activeRepoId={activeRepoId}
                    forceOpen={searching}
                    onEditRepo={openEdit}
                    onRename={openRename}
                    onDelete={openDelete}
                  />
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

      <RepoEditDialog isOpen={editOpen} onOpenChange={setEditOpen} repo={editRepo} />
      <WorkspaceNameDialog
        isOpen={nameOpen}
        onOpenChange={setNameOpen}
        mode={nameDialog.mode}
        initialName={nameDialog.ws?.name ?? ''}
        onSubmit={async (name) => {
          if (nameDialog.mode === 'create') return (await createWorkspace(name)) !== null
          return nameDialog.ws ? renameWorkspace(nameDialog.ws.id, name) : false
        }}
      />
      <ConfirmDialog
        isOpen={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="删除工作区"
        confirmLabel="删除"
        onConfirm={() => deleting && void deleteWorkspace(deleting.id)}
      >
        将删除工作区「{deleting?.name}」，其中的仓库会回到「未分组」，不会被移除，磁盘上的文件也不受影响。
      </ConfirmDialog>
    </Panel>
  )
}

export default Sidebar
