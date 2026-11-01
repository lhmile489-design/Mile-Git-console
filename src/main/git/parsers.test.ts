// git 输出解析器的单测：这些纯函数直接决定历史视图的显示内容，改动时必须有回归保护。
// 夹具全部来自真实 git 输出（-z 模式按 NUL 分段，路径不做转义）。
import { describe, expect, it } from 'vitest'
import { parseDiff, parseCommitLog, parseNameStatusZ, parseNumstatZ } from './index'

describe('parseNameStatusZ', () => {
  it('解析普通文件的状态字母', () => {
    // git show --format= --name-status -z HEAD 的真实输出：D\0b.txt\0M\0中文.txt\0
    const raw = 'D\0b.txt\0M\0中文.txt\0'
    const map = parseNameStatusZ(raw)
    expect(map.get('b.txt')).toEqual({ status: 'deleted' })
    expect(map.get('中文.txt')).toEqual({ status: 'modified' })
  })

  it('重命名保留旧路径，状态为 renamed', () => {
    // R066\0old.txt\0new.txt\0
    const map = parseNameStatusZ('R066\0old.txt\0new.txt\0')
    expect(map.get('new.txt')).toEqual({ status: 'renamed', oldPath: 'old.txt' })
  })

  it('中文路径不被转义', () => {
    const map = parseNameStatusZ('R100\0中文.txt\0新名.txt\0')
    expect(map.has('新名.txt')).toBe(true)
    expect(map.get('新名.txt')?.oldPath).toBe('中文.txt')
  })

  it('容忍条目前的换行和空段', () => {
    const map = parseNameStatusZ('\nA\0a.txt\0\0T\0b.txt\0')
    expect(map.get('a.txt')?.status).toBe('added')
    expect(map.get('b.txt')?.status).toBe('modified')
  })
})

describe('parseNumstatZ', () => {
  it('普通文件带增删行数', () => {
    const files = parseNumstatZ('0\t1\tb.txt\0', new Map())
    expect(files).toEqual([
      { path: 'b.txt', status: 'modified', additions: 0, deletions: 1 }
    ])
  })

  it('二进制文件记为 0 增 0 删', () => {
    const files = parseNumstatZ('-\t-\tbin.dat\0', new Map())
    expect(files[0]).toMatchObject({ path: 'bin.dat', additions: 0, deletions: 0 })
  })

  it('重命名从后续两段取旧路径和新路径', () => {
    const statusByPath = parseNameStatusZ('R066\0old.txt\0new.txt\0')
    const files = parseNumstatZ('1\t0\t\0old.txt\0new.txt\0', statusByPath)
    expect(files).toHaveLength(1)
    expect(files[0]).toMatchObject({
      path: 'new.txt',
      status: 'renamed',
      oldPath: 'old.txt',
      additions: 1,
      deletions: 0
    })
  })

  it('没有 name-status 数据时状态回退为 modified', () => {
    const files = parseNumstatZ('3\t2\tx.ts\0', new Map())
    expect(files[0]).toMatchObject({ path: 'x.ts', status: 'modified', additions: 3, deletions: 2 })
  })
})

describe('parseDiff', () => {
  const raw = [
    'diff --git a/a.txt b/a.txt',
    'index 1111111..2222222 100644',
    '--- a/a.txt',
    '+++ b/a.txt',
    '@@ -1,3 +1,3 @@',
    ' line1',
    '-old',
    '+new',
    ' line3',
    '\\ No newline at end of file'
  ].join('\n')

  it('跳过 diff 头，按 hunk 累加新旧行号', () => {
    const result = parseDiff('a.txt', raw)
    expect(result.isBinary).toBe(false)
    expect(result.hunks).toHaveLength(1)
    expect(result.hunks[0].lines).toEqual([
      { type: 'context', content: 'line1', oldLineNo: 1, newLineNo: 1 },
      { type: 'removed', content: 'old', oldLineNo: 2 },
      { type: 'added', content: 'new', newLineNo: 2 },
      { type: 'context', content: 'line3', oldLineNo: 3, newLineNo: 3 }
    ])
  })

  it('识别二进制 diff', () => {
    const result = parseDiff('img.png', 'diff --git a/img.png b/img.png\nBinary files a/img.png and b/img.png differ')
    expect(result.isBinary).toBe(true)
    expect(result.hunks).toHaveLength(0)
  })

  it('超过大小上限时标记 tooLarge', () => {
    const result = parseDiff('big.txt', 'x'.repeat(1024 * 1024 + 1))
    expect(result.tooLarge).toBe(true)
  })
})

describe('parseCommitLog', () => {
  const FS = '\x1f'
  const RS = '\x1e'
  const END = '\x1d'

  it('多行正文不会把后面的字段切丢', () => {
    const body = '第一行\n第二行'
    const header = ['abc123', 'abc', '标题', body, '米乐', 'm@e.com', '2026-10-01T10:00:00+08:00', 'tag: v1.0']
      .join(FS)
    const raw = `${RS}${header}${END}\n1\t2\tsrc/a.ts\n\n`
    const commits = parseCommitLog(raw)
    expect(commits).toHaveLength(1)
    expect(commits[0]).toMatchObject({
      hash: 'abc123',
      shortHash: 'abc',
      message: '标题',
      description: '第一行\n第二行',
      author: '米乐',
      email: 'm@e.com',
      date: '2026-10-01T10:00:00+08:00',
      changedFiles: 1,
      additions: 1,
      deletions: 2,
      tags: ['v1.0']
    })
  })

  it('无正文的提交不带 description', () => {
    const header = ['h1', 'h', 'msg', '', 'a', 'a@b', 'date', ''].join(FS)
    const commits = parseCommitLog(`${RS}${header}${END}\n`)
    expect(commits[0].description).toBeUndefined()
    expect(commits[0].tags).toBeUndefined()
    expect(commits[0].changedFiles).toBe(0)
  })

  it('多条记录按记录分隔符切开', () => {
    const mk = (hash: string): string =>
      `${RS}${[hash, hash.slice(0, 2), 'm', '', 'a', 'a@b', 'd', ''].join(FS)}${END}\n`
    const commits = parseCommitLog(mk('aaaa1111') + mk('bbbb2222'))
    expect(commits.map((c) => c.hash)).toEqual(['aaaa1111', 'bbbb2222'])
  })
})
