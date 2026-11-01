// getCommitDetail 的集成测试：直接对着真实 git 仓库跑，覆盖中文路径和重命名。
// 这两类输入以前会让历史视图显示乱码路径、状态退化成 modified、点开文件 diff 为空。
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { getCommitDetail, getCommitFileDiff } from './index'

const repoDir = mkdtempSync(join(tmpdir(), 'mgm-commit-detail-'))

function git(...args: string[]): string {
  return execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], {
    cwd: repoDir,
    encoding: 'utf8'
  })
}

afterAll(() => {
  rmSync(repoDir, { recursive: true, force: true })
})

describe('getCommitDetail', () => {
  it('中文文件名不转义，重命名带旧路径且 diff 可读', async () => {
    git('init', '-q')
    writeFileSync(join(repoDir, '中文.txt'), 'a\nb\n')
    git('add', '.')
    git('commit', '-qm', 'first')

    git('mv', '中文.txt', '新名.txt')
    writeFileSync(join(repoDir, '新名.txt'), 'a\nb\nc\n')
    git('commit', '-qam', 'rename')
    const hash = git('rev-parse', 'HEAD').trim()

    const detail = await getCommitDetail(repoDir, hash)
    expect(detail.files).toHaveLength(1)
    expect(detail.files[0]).toMatchObject({
      path: '新名.txt',
      status: 'renamed',
      oldPath: '中文.txt',
      additions: 1,
      deletions: 0
    })

    // 解析出的路径必须能直接当 pathspec 用，否则历史视图点开文件是空 diff
    const diff = await getCommitFileDiff(repoDir, hash, '新名.txt')
    expect(diff.isBinary).toBe(false)
    expect(diff.hunks.length).toBeGreaterThan(0)
  })
})
