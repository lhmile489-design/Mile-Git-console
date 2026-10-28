// Zustand 全局状态（渲染进程）
import { create } from 'zustand'
import type {
  RepoItem,
  GitStatus,
  BranchInfo,
  CommitEntry,
  CommitDetail,
  DiffResult,
  MainView,
  SelectedFile
} from '../types/ipc'
import * as repoApi from '../api/repo'
import * as gitApi from '../api/git'
import * as settingsApi from '../api/settings'
import { IpcError } from '../api/_invoke'
import { IPC_CANCELLED } from '../types/ipc'

// 远端长操作的进度（主进程经 git:progress 推送）
export interface RemoteProgress {
  repoPath: string
  op: 'fetch' | 'pull' | 'push'
  stage: string
  progress: number
}

function isRemoteProgress(v: unknown): v is RemoteProgress {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  return (
    typeof r.repoPath === 'string' &&
    (r.op === 'fetch' || r.op === 'pull' || r.op === 'push') &&
    typeof r.stage === 'string' &&
    typeof r.progress === 'number'
  )
}

// 提示卡片：error 不自动消失；success / info 由界面按是否带操作决定停留时长
export type ToastKind = 'error' | 'success' | 'info'
export interface ToastAction {
  label: string
  run: () => void
}
export interface Toast {
  id: number
  kind: ToastKind
  text: string
  action?: ToastAction
}
// 同时最多保留的提示条数，超出时丢弃最旧的
export const TOAST_LIMIT = 3
let toastSeq = 0

// 进度订阅只建立一次（init 可能被 StrictMode 调用两次）
let progressUnsubscribe: (() => void) | null = null

/**
 * LoadingState 用引用计数代替 boolean，解决并发竞态：
 *   - status / history / diff：并发调用计数器（> 0 即为 loading）
 *   - action：正在执行的远端/分支操作名（fetch/pull/push/switch 等）
 *   - isLoadingDetail：提交详情是否正在加载（独立标记，区分"加载中"和"加载失败"）
 */
interface LoadingState {
  statusCount: number      // git:status 并发计数
  historyCount: number     // git:log:list 并发计数
  diffCount: number        // git:diff 并发计数
  isLoadingDetail: boolean // 提交详情加载中
  action: string | null    // 正在执行的远端/分支操作名
}

/** 方便消费端读取的 derived booleans */
export function isStatusLoading(l: LoadingState): boolean { return l.statusCount > 0 }
export function isHistoryLoading(l: LoadingState): boolean { return l.historyCount > 0 }
export function isDiffLoading(l: LoadingState): boolean { return l.diffCount > 0 }

export type AppView = 'main' | 'settings'

interface AppState {
  // 数据
  repos: RepoItem[]
  activeRepoId: number | null
  gitStatus: GitStatus | null
  branches: BranchInfo[]
  commits: CommitEntry[]
  commitsHasMore: boolean
  commitDetail: CommitDetail | null
  /** 提交详情加载失败时记录错误消息，用于区分"加载中"和"加载失败" */
  commitDetailError: string | null
  diff: DiffResult | null
  // 视图
  view: AppView
  mainView: MainView
  selectedFile: SelectedFile | null
  selectedCommitHash: string | null
  selectedCommitFilePath: string | null
  // 反馈
  loading: LoadingState
  toasts: Toast[]
  // 布局：文件列表（及历史提交列表）卡片宽度，持久化到设置 layout.fileListWidth
  fileListWidth: number
  // 当前活动仓库的远端操作进度；没有远端操作或尚未收到进度时为 null
  remoteProgress: RemoteProgress | null

  // actions
  setView: (view: AppView) => void
  init: () => Promise<void>
  importRepo: () => Promise<void>
  removeRepo: (id: number) => Promise<void>
  selectRepo: (id: number) => Promise<void>
  refreshStatus: (opts?: { silent?: boolean }) => Promise<void>
  refreshBranches: () => Promise<void>
  loadHistory: (append?: boolean) => Promise<void>
  setMainView: (view: MainView) => void
  selectFile: (file: SelectedFile | null) => Promise<void>
  selectCommit: (hash: string | null) => Promise<void>
  selectCommitFile: (filePath: string) => Promise<void>
  stage: (paths: string[]) => Promise<void>
  unstage: (paths: string[]) => Promise<void>
  discard: (paths: string[]) => Promise<void>
  commit: (message: string, description?: string) => Promise<boolean>
  fetch: () => Promise<void>
  pull: () => Promise<void>
  push: (force?: boolean) => Promise<void>
  cancelRemote: () => Promise<void>
  createBranch: (name: string) => Promise<void>
  switchBranch: (name: string) => Promise<void>
  deleteBranch: (name: string, force?: boolean) => Promise<void>
  pushToast: (kind: ToastKind, text: string, action?: ToastAction) => void
  dismissToast: (id: number) => void
  setFileListWidth: (width: number) => void
  persistFileListWidth: () => Promise<void>
}

export const FILE_LIST_WIDTH_MIN = 240
export const FILE_LIST_WIDTH_MAX = 480
const FILE_LIST_WIDTH_DEFAULT = 320
const FILE_LIST_WIDTH_KEY = 'layout.fileListWidth'

function clampFileListWidth(width: number): number {
  if (!Number.isFinite(width)) return FILE_LIST_WIDTH_DEFAULT
  return Math.round(Math.min(FILE_LIST_WIDTH_MAX, Math.max(FILE_LIST_WIDTH_MIN, width)))
}

function activeRepoPath(state: AppState): string | null {
  const repo = state.repos.find((r) => r.id === state.activeRepoId)
  return repo ? repo.path : null
}

export const useAppStore = create<AppState>()((set, get) => {
  // 内部工具：追加一条提示。与最近一条完全相同时不重复追加
  const pushToast = (kind: ToastKind, text: string, action?: ToastAction): void => {
    const toasts = get().toasts
    const last = toasts[toasts.length - 1]
    if (last && last.kind === kind && last.text === text && !action) return
    const next = [...toasts, { id: ++toastSeq, kind, text, ...(action ? { action } : {}) }]
    set({ toasts: next.slice(-TOAST_LIMIT) })
  }

  // 内部工具：统一错误处理
  const run = async (fn: () => Promise<void>): Promise<void> => {
    try {
      await fn()
    } catch (err) {
      // 用户主动取消不是错误，给普通提示
      if (err instanceof IpcError && err.code === IPC_CANCELLED) {
        pushToast('info', '已取消')
        return
      }
      pushToast('error', err instanceof Error ? err.message : String(err))
    }
  }

  return {
    repos: [],
    activeRepoId: null,
    gitStatus: null,
    branches: [],
    commits: [],
    commitsHasMore: false,
    commitDetail: null,
    commitDetailError: null,
    diff: null,
    view: 'main',
    mainView: 'changes',
    selectedFile: null,
    selectedCommitHash: null,
    selectedCommitFilePath: null,
    loading: {
      statusCount: 0,
      historyCount: 0,
      diffCount: 0,
      isLoadingDetail: false,
      action: null
    },
    toasts: [],
    fileListWidth: FILE_LIST_WIDTH_DEFAULT,
    remoteProgress: null,

    init: async () => {
      if (!progressUnsubscribe) {
        progressUnsubscribe = window.electronAPI.on('git:progress', (payload) => {
          if (!isRemoteProgress(payload)) return
          const s = get()
          // 只展示当前活动仓库、且仍在进行中的操作的进度
          if (s.loading.action !== payload.op) return
          if (activeRepoPath(s) !== payload.repoPath) return
          set({ remoteProgress: payload })
        })
      }
      // 布局宽度读取失败不影响启动，保持默认值
      void settingsApi
        .getSetting(FILE_LIST_WIDTH_KEY)
        .then((v) => {
          if (typeof v === 'number') set({ fileListWidth: clampFileListWidth(v) })
        })
        .catch(() => {})
      await run(async () => {
        const repos = await repoApi.listRepos()
        set({ repos })
        if (repos.length > 0) {
          await get().selectRepo(repos[0].id)
        }
      })
    },

    setView: (view) => set({ view }),

    importRepo: async () => {
      const picked = await repoApi.openFolderDialog()
      if (!picked) return // 用户取消
      await run(async () => {
        const repo = await repoApi.addRepo(picked.path)
        const repos = await repoApi.listRepos()
        set({ repos })
        pushToast('success', `已导入仓库：${repo.name}`)
        await get().selectRepo(repo.id)
      })
    },

    removeRepo: async (id) => {
      await run(async () => {
        await repoApi.removeRepo(id)
        const repos = await repoApi.listRepos()
        const isActive = get().activeRepoId === id
        set({
          repos,
          ...(isActive
            ? {
                activeRepoId: null,
                gitStatus: null,
                branches: [],
                commits: [],
                commitDetail: null,
                commitDetailError: null,
                diff: null,
                selectedFile: null,
                selectedCommitHash: null
              }
            : {})
        })
        if (isActive && repos.length > 0) {
          await get().selectRepo(repos[0].id)
        }
      })
    },

    selectRepo: async (id) => {
      set({
        activeRepoId: id,
        gitStatus: null,
        branches: [],
        commits: [],
        commitsHasMore: false,
        commitDetail: null,
        commitDetailError: null,
        diff: null,
        selectedFile: null,
        selectedCommitHash: null,
        selectedCommitFilePath: null,
        toasts: get().toasts.filter((t) => t.kind !== 'error')
      })
      // 更新最近打开时间，确保下次启动仍选中此仓库
      void repoApi.touchRepo(id).catch(() => {
        // 更新时间戳失败不影响主流程
      })
      await get().refreshStatus()
      await get().refreshBranches()
      if (get().mainView === 'history') {
        await get().loadHistory()
      }
    },

    refreshStatus: async (opts) => {
      const repoPath = activeRepoPath(get())
      if (!repoPath) return
      // 引用计数 +1，防止并发竞态
      set((s) => ({ loading: { ...s.loading, statusCount: s.loading.statusCount + 1 } }))
      // silent：窗口聚焦等后台刷新，失败不弹错误卡片
      const exec = opts?.silent
        ? async (fn: () => Promise<void>): Promise<void> => {
            try {
              await fn()
            } catch {
              // 后台刷新失败忽略，等用户下一次手动操作再提示
            }
          }
        : run
      await exec(async () => {
        const gitStatus = await gitApi.getGitStatus(repoPath)
        set({ gitStatus })
        // 若当前选中文件仍有 diff 展示，刷新它
        const sel = get().selectedFile
        if (sel && get().mainView === 'changes') {
          const stillExists = gitStatus.files.some(
            (f) => f.path === sel.path && f.staged === sel.staged
          )
          if (stillExists) {
            const diff = await gitApi.getFileDiff(repoPath, sel.path, sel.staged)
            set({ diff })
          } else {
            set({ selectedFile: null, diff: null })
          }
        }
      })
      // 引用计数 -1
      set((s) => ({ loading: { ...s.loading, statusCount: Math.max(0, s.loading.statusCount - 1) } }))
    },

    refreshBranches: async () => {
      const repoPath = activeRepoPath(get())
      if (!repoPath) return
      await run(async () => {
        set({ branches: await gitApi.listBranches(repoPath) })
      })
    },

    loadHistory: async (append = false) => {
      const repoPath = activeRepoPath(get())
      if (!repoPath) return
      set((s) => ({ loading: { ...s.loading, historyCount: s.loading.historyCount + 1 } }))
      await run(async () => {
        const offset = append ? get().commits.length : 0
        const result = await gitApi.getCommitLog(repoPath, {
          limit: 50,
          offset
        })
        set({
          commits: append ? [...get().commits, ...result.commits] : result.commits,
          commitsHasMore: result.hasMore
        })
      })
      set((s) => ({ loading: { ...s.loading, historyCount: Math.max(0, s.loading.historyCount - 1) } }))
    },

    setMainView: (view) => {
      set({ mainView: view, diff: null })
      if (view === 'history' && get().commits.length === 0) {
        void get().loadHistory()
      }
    },

    selectFile: async (file) => {
      set({ selectedFile: file, diff: null })
      const repoPath = activeRepoPath(get())
      if (!file || !repoPath) return
      set((s) => ({ loading: { ...s.loading, diffCount: s.loading.diffCount + 1 } }))
      await run(async () => {
        const diff = await gitApi.getFileDiff(repoPath, file.path, file.staged)
        set({ diff })
      })
      set((s) => ({ loading: { ...s.loading, diffCount: Math.max(0, s.loading.diffCount - 1) } }))
    },

    selectCommit: async (hash) => {
      set({
        selectedCommitHash: hash,
        selectedCommitFilePath: null,
        commitDetail: null,
        commitDetailError: null,
        diff: null
      })
      const repoPath = activeRepoPath(get())
      if (!hash || !repoPath) return
      set((s) => ({ loading: { ...s.loading, isLoadingDetail: true } }))
      try {
        const detail = await gitApi.getCommitDetail(repoPath, hash)
        set({ commitDetail: detail, commitDetailError: null })
        // 默认选中第一个文件的 diff
        if (detail.files.length > 0) {
          await get().selectCommitFile(detail.files[0].path)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        set({ commitDetailError: msg })
        pushToast('error', msg)
      } finally {
        set((s) => ({ loading: { ...s.loading, isLoadingDetail: false } }))
      }
    },

    selectCommitFile: async (filePath) => {
      const repoPath = activeRepoPath(get())
      const hash = get().selectedCommitHash
      if (!repoPath || !hash) return
      set({ selectedCommitFilePath: filePath, diff: null })
      set((s) => ({ loading: { ...s.loading, diffCount: s.loading.diffCount + 1 } }))
      await run(async () => {
        const diff = await gitApi.getCommitFileDiff(repoPath, hash, filePath)
        set({ diff })
      })
      set((s) => ({ loading: { ...s.loading, diffCount: Math.max(0, s.loading.diffCount - 1) } }))
    },

    stage: async (paths) => {
      const repoPath = activeRepoPath(get())
      if (!repoPath) return
      await run(async () => {
        await gitApi.stageFiles(repoPath, paths)
        await get().refreshStatus()
      })
    },

    unstage: async (paths) => {
      const repoPath = activeRepoPath(get())
      if (!repoPath) return
      await run(async () => {
        await gitApi.unstageFiles(repoPath, paths)
        await get().refreshStatus()
      })
    },

    discard: async (paths) => {
      const repoPath = activeRepoPath(get())
      if (!repoPath) return
      await run(async () => {
        await gitApi.discardFiles(repoPath, paths)
        pushToast('success', '已丢弃所选变更')
        await get().refreshStatus()
      })
    },

    commit: async (message, description) => {
      const repoPath = activeRepoPath(get())
      if (!repoPath) return false
      let success = false
      await run(async () => {
        const result = await gitApi.commitChanges(repoPath, message, description)
        pushToast('success', `提交成功 ${result.commitHash.slice(0, 7)}`)
        success = true
      })
      if (success) {
        await get().refreshStatus()
        if (get().mainView === 'history') await get().loadHistory()
      }
      return success
    },

    fetch: async () => {
      const repoPath = activeRepoPath(get())
      if (!repoPath) return
      set((s) => ({ loading: { ...s.loading, action: 'fetch' } }))
      await run(async () => {
        await gitApi.fetchRemote(repoPath)
        pushToast('success', 'Fetch 完成')
      })
      set((s) => ({ loading: { ...s.loading, action: null }, remoteProgress: null }))
      await get().refreshStatus()
    },

    pull: async () => {
      const repoPath = activeRepoPath(get())
      if (!repoPath) return
      set((s) => ({ loading: { ...s.loading, action: 'pull' } }))
      await run(async () => {
        const result = await gitApi.pullRemote(repoPath)
        if (result.hasConflict) pushToast('error', 'Pull 产生合并冲突，请解决后提交')
        else pushToast('success', 'Pull 完成')
      })
      set((s) => ({ loading: { ...s.loading, action: null }, remoteProgress: null }))
      await get().refreshStatus()
    },

    push: async (force = false) => {
      const repoPath = activeRepoPath(get())
      if (!repoPath) return
      set((s) => ({ loading: { ...s.loading, action: 'push' } }))
      await run(async () => {
        const needUpstream = !get().gitStatus?.hasRemote
        await gitApi.pushRemote(repoPath, force, needUpstream)
        pushToast('success', force ? 'Force Push 完成' : 'Push 完成')
      })
      set((s) => ({ loading: { ...s.loading, action: null }, remoteProgress: null }))
      await get().refreshStatus()
    },

    // 取消正在进行的获取 / 拉取 / 推送；结果由原操作的 run 统一处理（1006 显示「已取消」）
    cancelRemote: async () => {
      const repoPath = activeRepoPath(get())
      if (!repoPath || get().loading.action === null) return
      try {
        await gitApi.cancelRemote(repoPath)
      } catch {
        // 取消请求本身失败时不打扰用户，原操作会照常结束
      }
    },

    createBranch: async (name) => {
      const repoPath = activeRepoPath(get())
      if (!repoPath) return
      await run(async () => {
        await gitApi.createBranch(repoPath, name)
        pushToast('success', `已创建并切换到分支：${name}`)
      })
      await get().refreshStatus()
      await get().refreshBranches()
    },

    switchBranch: async (name) => {
      const repoPath = activeRepoPath(get())
      if (!repoPath) return
      set((s) => ({ loading: { ...s.loading, action: 'switch' } }))
      await run(async () => {
        await gitApi.switchBranch(repoPath, name)
        pushToast('success', `已切换到分支：${name}`)
      })
      await get().refreshStatus()
      await get().refreshBranches()
      if (get().mainView === 'history') await get().loadHistory()
      set((s) => ({ loading: { ...s.loading, action: null } }))
    },

    deleteBranch: async (name, force = false) => {
      const repoPath = activeRepoPath(get())
      if (!repoPath) return
      await run(async () => {
        await gitApi.deleteBranch(repoPath, name, force)
        pushToast('success', `已删除分支：${name}`)
      })
      await get().refreshBranches()
    },

    pushToast,

    dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

    // 拖拽过程中只改内存状态，松手时再持久化，避免每帧写一次设置文件
    setFileListWidth: (width) => set({ fileListWidth: clampFileListWidth(width) }),

    persistFileListWidth: async () => {
      try {
        await settingsApi.setSetting(FILE_LIST_WIDTH_KEY, get().fileListWidth)
      } catch {
        // 宽度保存失败不提示，下次启动回到默认宽度
      }
    }
  }
})

// 常用 selector
export const useActiveRepo = (): RepoItem | null =>
  useAppStore((s) => s.repos.find((r) => r.id === s.activeRepoId) ?? null)
