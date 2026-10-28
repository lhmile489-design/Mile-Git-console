# Mile Git Management

桌面端 Git 仓库管理工具，基于 Electron + React + TypeScript。在一个窗口里管理多个本地仓库：查看工作区变更、暂存与提交、切换和新建分支、浏览提交历史，以及获取、拉取、推送远端。

当前版本：`2.1.0`

## 功能

- 仓库管理：导入本地仓库、搜索、移除（只移除列表记录，不删磁盘文件）
- 工作区：暂存 / 取消暂存（单个、批量勾选、全部）、丢弃更改（需二次确认）、提交摘要与描述
- Diff：按行显示增删，支持在 Diff 卡片头直接暂存或取消暂存
- 分支：切换、新建本地分支
- 远端：获取、拉取、推送，显示 ahead / behind 数量；强制推送需二次确认
- 提交历史：分页加载，查看提交详情、改动文件列表和单文件 Diff
- 外观：浅色 / 深色 / 跟随系统，选择会持久化；文件列表宽度可拖拽并记住

## 技术栈

| 层 | 技术 |
|---|---|
| 运行时 | Electron 33 |
| 渲染进程 | React 18 + TypeScript（strict）+ Zustand |
| 组件 | `react-aria-components` 负责交互与无障碍，视觉自绘（`src/renderer/src/components/common/`） |
| 样式 | CSS 变量设计令牌（`src/renderer/src/styles/tokens.css`），进化柔性 UI 风格 |
| 字体 | Nunito（`@fontsource/nunito` 本地打包），中文回退微软雅黑 UI / 苹方 |
| 图标 | `lucide-react`，线宽 1.75 |
| Git | `simple-git`（仅主进程） |
| 存储 | `better-sqlite3`（仓库列表、操作日志）、`electron-store`（设置） |
| 构建 | electron-vite 2 + electron-builder 25 |

## 开发

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npm run build
```

```bash
npm run dist:win
```

`npm run build` 不做类型检查，提交前必须单独跑 `npm run typecheck`。

## 目录

```
src/
  main/          主进程：窗口、托盘、IPC handler、git 封装、SQLite
  preload/       contextBridge，暴露 window.electronAPI（invoke 白名单）
  shared/types/  主进程与渲染进程共用的 IPC 类型
  renderer/src/
    components/common/  基础组件：Button、IconButton、ConfirmDialog、Segmented、Panel、ResizeHandle
    components/layout/  Titlebar、Sidebar、Workspace
    components/git/     工具栏、文件列表、提交区、Diff、提交历史
    pages/              设置页
    store/              Zustand 状态
    styles/             tokens.css、global.css、ui.css、components.css
```

## 安全约定

- `contextIsolation: true`、`sandbox: true`、`nodeIntegration: false`
- 渲染进程只能通过 preload 白名单内的 IPC channel 调用主进程
- 丢弃更改、强制推送、移除仓库都必须经过确认对话框
- git 凭据不写入 SQLite 或源码

## 文档

- `CLAUDE.md`：本端开发规范
- `docs/UI重构文档.md`：设计令牌、布局与组件规格、实施记录
- `docs/踩坑记录.md`：开发中遇到的问题与处理方式
- `../docs/IPC契约.md`、`../docs/数据库设计.md`：IPC 契约与表结构
