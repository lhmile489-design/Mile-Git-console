// Git 操作封装层（simple-git 调用，仅主进程使用）
import fs from 'fs'
import path from 'path'
import simpleGit, { type SimpleGit } from 'simple-git'
import type {
  GitStatus,
  GitFileStatus,
  GitFileStatusType,
  DiffResult,
  DiffHunk,
  BranchInfo,
  CommitEntry,
  CommitLogResult,
  CommitDetail,
  CommitFileChange
} from '../types/ipc'

export class GitError extends Error {
  constructor(
    message: string,
    public readonly kind: 'git' | 'remote' | 'conflict' = 'git'
  ) {
    super(message)
  }
}

function git(repoPath: string): SimpleGit {
  // 过滤 Electron/shell 环境中会干扰 git 子进程的变量：
  // - GIT_EDITOR / EDITOR / VISUAL：git 需要编辑器时会尝试执行，值无效会报 "not permitted"
  // - GIT_SSH / GIT_SSH_COMMAND：simple-git 安全检查会拦截
  // - GIT_ASKPASS / SSH_ASKPASS：same，触发 allowUnsafeAskPass 检查
  const safeEnv = { ...process.env }
  const stripVars = [
    'GIT_EDITOR', 'EDITOR', 'VISUAL',
    'GIT_SSH', 'GIT_SSH_COMMAND',
    'GIT_PROXY_COMMAND', 'GIT_EXEC_PATH',
    'GIT_ASKPASS', 'SSH_ASKPASS',
  ]
  for (const v of stripVars) delete safeEnv[v]

  return simpleGit(repoPath).env({
    ...safeEnv,
    // 强制使用非交互模式：Electron 子进程无 tty，不能弹密码/编辑器窗口
    GIT_TERMINAL_PROMPT: '0',
    GCM_INTERACTIVE: 'never',
    GIT_MERGE_AUTOEDIT: 'no',   // 禁止 merge 时自动打开编辑器
  })
}

export function isGitRepo(repoPath: string): boolean {
  return fs.existsSync(path.join(repoPath, '.git'))
}

function isRemoteError(msg: string): boolean {
  return /could not resolve|failed to connect|connection|network|timed out|unable to access|authentication failed|repository not found|permission denied|403|401/i.test(
    msg
  )
}

function isConflictError(msg: string): boolean {
  return /conflict|automatic merge failed/i.test(msg)
}

async function wrap<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (isConflictError(msg)) throw new GitError(msg, 'conflict')
    if (isRemoteError(msg)) throw new GitError(msg, 'remote')
    throw new GitError(msg, 'git')
  }
}

// ---------------------------------------------------------------- 状态
const INDEX_STATUS: Record<string, GitFileStatusType> = {
  A: 'added',
  M: 'modified',
  D: 'deleted',
  R: 'renamed',
  C: 'added',
  T: 'modified'
}

export async function getStatus(repoPath: string): Promise<GitStatus> {
  return wrap(async () => {
    const status = await git(repoPath).status()
    const files: GitFileStatus[] = []

    const renamedFrom = new Map(
      status.renamed.map((r) => [r.to, r.from] as const)
    )
    const conflicted = new Set(status.conflicted)

    for (const f of status.files) {
      if (conflicted.has(f.path)) {
        files.push({ path: f.path, status: 'conflict', staged: false })
        continue
      }
      // 暂存区变更（index 列）
      if (f.index && f.index !== ' ' && f.index !== '?') {
        files.push({
          path: f.path,
          status: INDEX_STATUS[f.index] ?? 'modified',
          staged: true,
          ...(f.index === 'R' && renamedFrom.has(f.path)
            ? { oldPath: renamedFrom.get(f.path) }
            : {})
        })
      }
      // 工作区变更（working_dir 列）
      if (f.working_dir && f.working_dir !== ' ') {
        files.push({
          path: f.path,
          status:
            f.working_dir === '?'
              ? 'untracked'
              : (INDEX_STATUS[f.working_dir] ?? 'modified'),
          staged: false
        })
      }
    }

    let hasRemote = !!status.tracking
    if (!hasRemote) {
      const remotes = await git(repoPath).getRemotes(false)
      hasRemote = remotes.length > 0
    }

    return {
      branch: status.current ?? 'HEAD',
      ahead: status.ahead,
      behind: status.behind,
      hasRemote,
      files
    }
  })
}

// ---------------------------------------------------------------- 暂存/提交
export async function stageFiles(
  repoPath: string,
  filePaths: string[]
): Promise<void> {
  return wrap(() => git(repoPath).add(filePaths).then(() => undefined))
}

export async function unstageFiles(
  repoPath: string,
  filePaths: string[]
): Promise<void> {
  return wrap(async () => {
    if (filePaths.length === 1 && filePaths[0] === '.') {
      await git(repoPath).reset(['HEAD'])
      return
    }
    await git(repoPath).reset(['HEAD', '--', ...filePaths])
  })
}

export async function discardFiles(
  repoPath: string,
  filePaths: string[]
): Promise<void> {
  return wrap(async () => {
    // 安全校验：所有路径必须在仓库根目录内，防止路径穿越攻击
    const resolvedRoot = path.resolve(repoPath)
    for (const p of filePaths) {
      const abs = path.resolve(repoPath, p)
      if (!abs.startsWith(resolvedRoot + path.sep) && abs !== resolvedRoot) {
        throw new GitError(`路径穿越检测，拒绝操作：${p}`, 'git')
      }
    }

    // 已跟踪文件用 checkout 还原；未跟踪文件直接删除
    const status = await git(repoPath).status()
    const untracked = new Set(status.not_added)
    const tracked = filePaths.filter((p) => !untracked.has(p))
    const toDelete = filePaths.filter((p) => untracked.has(p))
    if (tracked.length > 0) {
      await git(repoPath).checkout(['--', ...tracked])
    }
    for (const p of toDelete) {
      const abs = path.resolve(repoPath, p)
      if (fs.existsSync(abs)) fs.rmSync(abs, { force: true })
    }
  })
}

export async function commit(
  repoPath: string,
  message: string,
  description?: string
): Promise<{ commitHash: string }> {
  return wrap(async () => {
    const status = await git(repoPath).status()
    if (status.staged.length === 0) {
      throw new GitError('暂存区为空，没有可提交的变更', 'git')
    }
    const msg = description ? `${message}\n\n${description}` : message
    const result = await git(repoPath).commit(msg)
    return { commitHash: result.commit }
  })
}

// ---------------------------------------------------------------- Diff
export async function getDiff(
  repoPath: string,
  filePath: string,
  staged = false
): Promise<DiffResult> {
  return wrap(async () => {
    // 未跟踪文件：构造全量 added 的 diff
    const status = await git(repoPath).status()
    if (status.not_added.includes(filePath)) {
      const abs = path.join(repoPath, filePath)
      const content = fs.existsSync(abs)
        ? fs.readFileSync(abs, 'utf-8')
        : ''
      const lines = content.split('\n')
      return {
        filePath,
        isBinary: false,
        hunks: [
          {
            header: `@@ -0,0 +1,${lines.length} @@ (新文件)`,
            lines: lines.map((l, i) => ({
              type: 'added' as const,
              content: l,
              newLineNo: i + 1
            }))
          }
        ]
      }
    }

    const args = staged
      ? ['--cached', '--', filePath]
      : ['--', filePath]
    const raw = await git(repoPath).diff(args)
    return parseDiff(filePath, raw)
  })
}

export function parseDiff(filePath: string, raw: string): DiffResult {
  if (/Binary files|GIT binary patch/.test(raw)) {
    return { filePath, hunks: [], isBinary: true }
  }
  const hunks: DiffHunk[] = []
  let current: DiffHunk | null = null
  let oldNo = 0
  let newNo = 0

  for (const line of raw.split('\n')) {
    const hunkMatch = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
    if (hunkMatch) {
      current = { header: line, lines: [] }
      hunks.push(current)
      oldNo = parseInt(hunkMatch[1], 10)
      newNo = parseInt(hunkMatch[2], 10)
      continue
    }
    if (!current) continue // 跳过 diff 头（---、+++、index 等）
    if (line.startsWith('\\')) continue // "\ No newline at end of file"

    if (line.startsWith('+')) {
      current.lines.push({ type: 'added', content: line.slice(1), newLineNo: newNo++ })
    } else if (line.startsWith('-')) {
      current.lines.push({ type: 'removed', content: line.slice(1), oldLineNo: oldNo++ })
    } else if (line.startsWith(' ')) {
      // 只有明确以空格开头的行才是 context 行，才累加行号
      current.lines.push({
        type: 'context',
        content: line.slice(1),
        oldLineNo: oldNo++,
        newLineNo: newNo++
      })
    }
    // 其他不以 +/-/空格 开头的行（如 diff 头残留）：跳过，不累加行号
  }
  return { filePath, hunks, isBinary: false }
}

// 获取某提交中单个文件的 diff
export async function getCommitFileDiff(
  repoPath: string,
  hash: string,
  filePath: string
): Promise<DiffResult> {
  return wrap(async () => {
    const raw = await git(repoPath).show([
      '--format=',
      '--patch',
      hash,
      '--',
      filePath
    ])
    return parseDiff(filePath, raw)
  })
}

// ---------------------------------------------------------------- 分支
export async function listBranches(repoPath: string): Promise<BranchInfo[]> {
  return wrap(async () => {
    const status = await git(repoPath).status()
    const format = [
      '%(refname:short)',
      '%(objectname:short)',
      '%(committerdate:iso8601)',
      '%(subject)',
      '%(refname)'
    ].join('%1f')
    const raw = await git(repoPath).raw([
      'for-each-ref',
      `--format=${format}`,
      'refs/heads',
      'refs/remotes'
    ])
    const branches: BranchInfo[] = []
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue
      const [name, hash, date, subject, fullRef] = line.split('\x1f')
      const isRemote = fullRef.startsWith('refs/remotes/')
      branches.push({
        name: isRemote ? name : name,
        isCurrent: !isRemote && name === status.current,
        isRemote,
        lastCommitHash: hash ?? '',
        lastCommitMessage: subject ?? '',
        lastCommitDate: date ?? ''
      })
    }
    // 本地分支在前，当前分支最前
    branches.sort((a, b) => {
      if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1
      if (a.isRemote !== b.isRemote) return a.isRemote ? 1 : -1
      return a.name.localeCompare(b.name)
    })
    return branches
  })
}

export async function createBranch(
  repoPath: string,
  branchName: string,
  fromBranch?: string
): Promise<void> {
  return wrap(async () => {
    if (fromBranch) {
      await git(repoPath).checkout(['-b', branchName, fromBranch])
    } else {
      await git(repoPath).checkoutLocalBranch(branchName)
    }
  })
}

export async function switchBranch(
  repoPath: string,
  branchName: string
): Promise<void> {
  return wrap(async () => {
    try {
      await git(repoPath).checkout(branchName)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (/local changes|would be overwritten/i.test(msg)) {
        throw new GitError(
          '工作区有未提交的变更，请先提交或丢弃后再切换分支',
          'git'
        )
      }
      throw err
    }
  })
}

export async function mergeBranch(
  repoPath: string,
  sourceBranch: string
): Promise<{ hasConflict: boolean }> {
  try {
    await git(repoPath).merge([sourceBranch])
    return { hasConflict: false }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (isConflictError(msg)) return { hasConflict: true }
    if (isRemoteError(msg)) throw new GitError(msg, 'remote')
    throw new GitError(msg, 'git')
  }
}

export async function deleteBranch(
  repoPath: string,
  branchName: string,
  force = false
): Promise<void> {
  return wrap(() =>
    git(repoPath)
      .branch([force ? '-D' : '-d', branchName])
      .then(() => undefined)
  )
}

// ---------------------------------------------------------------- 远端
export async function fetchRemote(repoPath: string): Promise<void> {
  return wrap(() => git(repoPath).fetch().then(() => undefined))
}

export async function pullRemote(
  repoPath: string
): Promise<{ hasConflict: boolean }> {
  try {
    await git(repoPath).pull()
    return { hasConflict: false }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (isConflictError(msg)) return { hasConflict: true }
    if (isRemoteError(msg)) throw new GitError(msg, 'remote')
    throw new GitError(msg, 'git')
  }
}

export async function pushRemote(
  repoPath: string,
  options: { force?: boolean; setUpstream?: boolean; remote?: string } = {}
): Promise<void> {
  return wrap(async () => {
    const status = await git(repoPath).status()
    const args: string[] = []
    if (options.force) args.push('--force')
    // 无上游分支时自动 -u（有远端但未 track 也覆盖）
    if (options.setUpstream || !status.tracking) {
      args.push('-u', options.remote ?? 'origin', status.current ?? 'HEAD')
    }
    await git(repoPath).push(args)
  })
}

// ---------------------------------------------------------------- 提交历史
const LOG_FIELD_SEP = '\x1f'
const LOG_RECORD_SEP = '\x1e'
// header 结束标记：%b 可能含多行，不能按换行切 header，必须按此标记切
const LOG_HEADER_END = '\x1d'
const LOG_FORMAT = [
  '%H',
  '%h',
  '%s',
  '%b',
  '%an',
  '%ae',
  '%aI',
  '%D'
].join(LOG_FIELD_SEP)

function parseNumstat(numstat: string): {
  changedFiles: number
  additions: number
  deletions: number
} {
  let files = 0
  let adds = 0
  let dels = 0
  for (const line of numstat.split('\n')) {
    const m = line.match(/^(\d+|-)\t(\d+|-)\t/)
    if (!m) continue
    files++
    if (m[1] !== '-') adds += parseInt(m[1], 10)
    if (m[2] !== '-') dels += parseInt(m[2], 10)
  }
  return { changedFiles: files, additions: adds, deletions: dels }
}

function parseTags(decoration: string): string[] | undefined {
  if (!decoration.trim()) return undefined
  const tags = decoration
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.startsWith('tag: '))
    .map((s) => s.slice(5))
  return tags.length > 0 ? tags : undefined
}

// 解析 `git log --format=<RS><LOG_FORMAT><HEADER_END> --numstat` 的原始输出（纯函数，便于单测）
export function parseCommitLog(raw: string): CommitEntry[] {
  const commits: CommitEntry[] = []
  for (const chunk of raw.split(LOG_RECORD_SEP)) {
    if (!chunk.trim()) continue
    const end = chunk.indexOf(LOG_HEADER_END)
    const header = end === -1 ? chunk : chunk.slice(0, end)
    const numstat = end === -1 ? '' : chunk.slice(end + 1)
    const [hash, shortHash, message, body, author, email, date, deco] =
      header.split(LOG_FIELD_SEP)
    if (!hash?.trim()) continue
    const stats = parseNumstat(numstat)
    const tags = parseTags(deco ?? '')
    commits.push({
      hash: hash.trim(),
      shortHash: (shortHash ?? '').trim(),
      message: (message ?? '').trim(),
      ...(body?.trim() ? { description: body.trim() } : {}),
      author: (author ?? '').trim(),
      email: (email ?? '').trim(),
      date: (date ?? '').trim(),
      changedFiles: stats.changedFiles,
      additions: stats.additions,
      deletions: stats.deletions,
      ...(tags ? { tags } : {})
    })
  }
  return commits
}

export async function getCommitLog(
  repoPath: string,
  options: {
    branch?: string
    limit?: number
    offset?: number
    filePath?: string
  } = {}
): Promise<CommitLogResult> {
  return wrap(async () => {
    const limit = options.limit ?? 50
    const offset = options.offset ?? 0
    const args = [
      'log',
      // 注意：分隔符放格式前缀。git 的 --numstat 输出在 format 块之后，
      // 若把 \x1e 放在 format 末尾，numstat 会被切到下一条记录里
      `--format=${LOG_RECORD_SEP}${LOG_FORMAT}${LOG_HEADER_END}`,
      '--numstat',
      `--max-count=${limit}`,
      `--skip=${offset}`
    ]
    if (options.branch) args.push(options.branch)
    if (options.filePath) args.push('--', options.filePath)

    const raw = await git(repoPath).raw(args)
    const commits = parseCommitLog(raw)

    // 总数（用于分页）；空仓库或分支无 commit 时 rev-list 会报错，单独处理
    let total = 0
    try {
      const countArgs = ['rev-list', '--count', options.branch ?? 'HEAD']
      if (options.filePath) countArgs.push('--', options.filePath)
      const totalRaw = await git(repoPath).raw(countArgs)
      total = parseInt(totalRaw.trim(), 10) || 0
    } catch {
      // 仓库为空（no commits yet）或指定分支不存在时正常返回 0
      total = 0
    }

    return { commits, total, hasMore: offset + commits.length < total }
  })
}

const STATUS_LETTER: Record<string, CommitFileChange['status']> = {
  A: 'added',
  M: 'modified',
  D: 'deleted',
  R: 'renamed',
  T: 'modified',
  C: 'added'
}

export async function getCommitDetail(
  repoPath: string,
  hash: string
): Promise<CommitDetail> {
  return wrap(async () => {
    const metaRaw = await git(repoPath).raw([
      'show',
      `--format=${LOG_FORMAT}`,
      '--no-patch',
      hash
    ])
    const [full, short, message, body, author, email, date, deco] = metaRaw
      .trim()
      .split(LOG_FIELD_SEP)

    // name-status：状态字母 + 路径
    const nsRaw = await git(repoPath).raw([
      'show',
      '--format=',
      '--name-status',
      hash
    ])
    const statusByPath = new Map<
      string,
      { status: CommitFileChange['status']; oldPath?: string }
    >()
    for (const line of nsRaw.split('\n')) {
      if (!line.trim()) continue
      const parts = line.split('\t')
      const letter = parts[0].charAt(0)
      if (letter === 'R' || letter === 'C') {
        statusByPath.set(parts[2], {
          status: STATUS_LETTER[letter] ?? 'modified',
          oldPath: parts[1]
        })
      } else {
        statusByPath.set(parts[1], {
          status: STATUS_LETTER[letter] ?? 'modified'
        })
      }
    }

    // numstat：增删行数
    const numRaw = await git(repoPath).raw([
      'show',
      '--format=',
      '--numstat',
      hash
    ])
    const files: CommitFileChange[] = []
    for (const line of numRaw.split('\n')) {
      const m = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/)
      if (!m) continue
      const filePath = m[3]
      const st = statusByPath.get(filePath) ?? { status: 'modified' as const }
      files.push({
        path: filePath,
        status: st.status,
        ...(st.oldPath ? { oldPath: st.oldPath } : {}),
        additions: m[1] === '-' ? 0 : parseInt(m[1], 10),
        deletions: m[2] === '-' ? 0 : parseInt(m[2], 10)
      })
    }

    const tags = parseTags(deco ?? '')
    return {
      hash: full.trim(),
      shortHash: (short ?? '').trim(),
      message: (message ?? '').trim(),
      ...(body?.trim() ? { description: body.trim() } : {}),
      author: (author ?? '').trim(),
      email: (email ?? '').trim(),
      date: (date ?? '').trim(),
      changedFiles: files.length,
      additions: files.reduce((s, f) => s + f.additions, 0),
      deletions: files.reduce((s, f) => s + f.deletions, 0),
      ...(tags ? { tags } : {}),
      files
    }
  })
}
