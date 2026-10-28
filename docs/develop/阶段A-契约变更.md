# 阶段 A 契约变更（待主调度合并进根目录 `docs/IPC契约.md`）

> 来源分支：`feat/experience-a`
> 本端规范禁止修改根目录文件，契约变更先记录在这里。

## A2 长操作进度与取消

### 新增错误码

| code | 含义 |
|---|---|
| 1006 | 用户主动取消（不是失败，渲染层显示普通提示「已取消」） |

### 变更：`git:remote:fetch` / `git:remote:pull` / `git:remote:push`

- 入参、出参不变。
- 同一仓库同一时间只允许一个远端操作。重复调用返回 `{ code: 9001, msg: '该仓库已有远端操作正在进行' }`。
- 被取消时返回 `{ code: 1006, msg: '已取消', data: null }`，操作日志记为 `cancelled`。
- 执行期间主进程推送 `git:progress` 事件（见下）。

### 新增：`git:remote:cancel`

- **入参**：`{ repoPath: string }`
- **出参**：`null`
- **说明**：取消该仓库正在进行的远端操作。没有进行中的操作时也返回成功。

### 新增推送事件：`git:progress`（主进程 → 渲染进程）

```typescript
interface RemoteProgress {
  repoPath: string
  op: 'fetch' | 'pull' | 'push'
  stage: string    // git stderr 首个单词，小写，如 'remote:'、'receiving'、'resolving'
  progress: number // 0 到 100
}
```

- 同一操作最多每 100ms 推送一次，`progress` 为 100 时一定推送。
- 只有 git 输出带百分比的阶段才会推送，部分小仓库可能没有任何进度事件。

### 变更：preload `window.electronAPI.on`

- `on(channel, listener)` 改为返回取消订阅函数 `() => void`。
- 删除 `off()`。原实现拿不到 `on` 内部包装后的监听器，无法真正移除。

## A7 仓库失效处理

### 变更：`repo:list`

- 返回的 `RepoItem` 新增可选字段 `missing?: boolean`。每次列出时检查目录是否仍是 Git 仓库，不是则为 `true`。该字段实时计算，不写入数据库，不需要迁移。

### 新增：`repo:relocate`

- 入参：`{ id: number; path: string }`
- 出参：`RepoItem`（更新后的记录，名称随新目录名更新，操作日志保留）
- 错误：
  - 2002：缺少 id 或 path；新路径已被列表中另一个仓库占用；id 不存在
  - 1003：新路径不是有效的 Git 仓库
  - 2001：数据库写入失败
