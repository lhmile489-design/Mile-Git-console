# CLAUDE.md — Git-Management-electron · Electron 端开发规范

> 本文件适用于在 `Git-Management-electron/` 目录下启动的 Electron 开发 session。
> 主调度 session 在根目录 `Mile-Git-Management/`，不直接读写本目录源码。
> 最后更新：2026-10-28（v2：UI 重构为进化柔性 UI，移除 React Spectrum）

---

## 1. 项目信息

| 项 | 值 |
|---|---|
| 应用名 | Mile Git Management |
| 应用 ID | `com.mile.git-management` |
| 版本 | `2.0.0` |
| 入口（主进程） | `src/main/index.ts` |
| 入口（渲染进程） | `src/renderer/src/main.tsx` |
| Preload | `src/preload/index.ts` |
| 构建工具 | electron-vite 2.x + Vite 5 |
| 打包工具 | electron-builder 25.x |
| Node 版本 | 20.x |

---

## 2. 技术栈

| 层 | 技术 | 说明 |
|---|---|---|
| 运行时 | Electron 33.x | 主进程 + 渲染进程容器 |
| 渲染框架 | React 18 + TypeScript | 渲染进程 UI |
| UI 组件库 | `react-aria-components` + 自绘样式（`components/common/`） | 交互与无障碍来自 React Aria，视觉为进化柔性 UI |
| 底层交互 | React Aria（`@react-aria/*`） | 可单独引入，接管交互逻辑 |
| 样式方案 | CSS 变量（`tokens.css`）+ 全局样式 | 无 CSS-in-JS；设计令牌单一来源 |
| Git 操作 | `simple-git` | Node.js Git 封装，在主进程调用 |
| 本地存储 | `better-sqlite3` | SQLite，同步 API，仅在主进程使用 |
| 配置持久化 | `electron-store` | 应用设置（主题偏好、窗口大小等） |
| 状态管理 | Zustand | 轻量状态管理，渲染进程内使用 |
| IPC 通信 | Electron ipcMain / ipcRenderer + contextBridge | 主进程与渲染进程通信唯一通道 |

---

## 3. 目录结构

```
Git-Management-electron/
├── src/
│   ├── main/                    # 主进程（Node.js 环境）
│   │   ├── index.ts             # 入口：BrowserWindow 创建、app 生命周期
│   │   ├── ipc/                 # IPC handler，按模块分文件
│   │   │   ├── repo.ts          # 仓库管理相关 IPC
│   │   │   ├── git.ts           # Git 操作相关 IPC
│   │   │   └── settings.ts      # 设置相关 IPC
│   │   ├── git/                 # Git 操作封装（simple-git 调用层）
│   │   │   └── index.ts
│   │   ├── storage/             # 本地存储层
│   │   │   ├── db.ts            # SQLite 初始化、迁移
│   │   │   └── migrations/      # 迁移脚本（001_init.sql 等）
│   │   └── utils/               # 主进程工具函数
│   │
│   ├── preload/                 # Preload 脚本（沙箱环境）
│   │   └── index.ts             # contextBridge 暴露 window.electronAPI
│   │
│   └── renderer/                # 渲染进程（浏览器环境）
│       ├── index.html           # HTML 入口
│       └── src/
│           ├── main.tsx         # React 入口，I18nProvider
│           ├── App.tsx          # 根组件，整体布局
│           ├── components/      # 通用组件
│           │   ├── layout/      # 布局组件（Sidebar、Titlebar 等）
│           │   ├── git/         # Git 相关 UI 组件
│           │   └── common/      # 通用 UI 组件（Button 封装等）
│           ├── pages/           # 页面级组件
│           ├── hooks/           # 自定义 Hook
│           │   ├── useIpc.ts    # IPC 调用 Hook
│           │   └── useGit.ts    # Git 状态 Hook
│           ├── store/           # Zustand 状态（按模块分文件）
│           ├── api/             # IPC 调用封装（渲染进程视角的"接口层"）
│           │   ├── repo.ts
│           │   ├── git.ts
│           │   └── settings.ts
│           ├── styles/
│           │   ├── tokens.css   # 设计令牌（颜色/字体/间距/阴影/圆角）SoT
│           │   └── global.css   # 全局基础样式
│           └── types/           # TypeScript 类型定义
│               └── ipc.ts       # IPC 入参/出参类型
│
├── resources/                   # 应用图标（不打包进渲染包）
│   ├── icon.ico                 # Windows
│   ├── icon.icns                # macOS
│   └── icon.png                 # Linux
│
├── docs/                        # 本端文档（不进主调度视野）
│   └── ...
│
├── electron.vite.config.ts      # electron-vite 配置
├── electron-builder.yml         # 打包配置（可选，也可写在 package.json）
├── tsconfig.json                # TypeScript 根配置（引用 node + web）
├── tsconfig.node.json           # 主进程 + preload TS 配置
├── tsconfig.web.json            # 渲染进程 TS 配置
├── package.json
├── .gitignore
└── CLAUDE.md（本文件）
```

---

## 4. 安全约束（铁律）

1. **`contextIsolation: true`，`nodeIntegration: false`**——已在 `src/main/index.ts` 固定，不得修改
2. **渲染进程禁止直接 `require` 任何 Node.js 模块**（`fs`、`child_process`、`path` 等）
3. **所有 Node.js 能力必须通过 `contextBridge` + IPC 暴露给渲染进程**
4. **`preload/index.ts` 是唯一的桥接文件**，不得在渲染进程绕过它
5. **git 凭据、SSH Key、token 不存入 SQLite 或源码**——凭据走系统凭据管理器

---

## 5. IPC 通信规范

### 5.1 Channel 命名规则

```
<模块>:<动作>

示例：
  repo:list          获取仓库列表
  repo:add           添加仓库
  repo:remove        移除仓库
  git:status         查询工作区状态
  git:stage          暂存文件
  git:unstage        取消暂存
  git:commit         执行提交
  git:branch:list    获取分支列表
  git:branch:create  创建分支
  git:branch:switch  切换分支
  git:log            获取提交历史
  git:diff           获取文件 diff
  git:fetch          执行 fetch
  git:pull           执行 pull
  git:push           执行 push
  settings:get       获取设置项
  settings:set       保存设置项
```

### 5.2 统一响应格式

主进程所有 handler **必须**返回此格式，不得直接 throw：

```typescript
// src/types/ipc.ts（主进程和渲染进程共用）
interface IpcResponse<T = unknown> {
  code: number   // 0 = 成功；非 0 = 失败
  msg: string    // 成功时为 'ok'，失败时为错误描述
  data: T | null
}
```

**错误码表**：

| code | 含义 |
|---|---|
| 0 | 成功 |
| 1001 | Git 命令执行失败（git exit code 非 0） |
| 1002 | 仓库路径不存在 |
| 1003 | 不是有效 Git 仓库 |
| 1004 | 远端连接失败（fetch/push/pull 网络错误） |
| 1005 | 合并冲突（需用户手动解决） |
| 2001 | 本地存储读写失败 |
| 2002 | 数据格式错误 |
| 9001 | 未知错误 |

### 5.3 主进程 handler 写法

```typescript
// src/main/ipc/git.ts
import { ipcMain } from 'electron'
import type { IpcResponse } from '../../types/ipc'

ipcMain.handle('git:status', async (_event, payload: { repoPath: string }): Promise<IpcResponse> => {
  try {
    const status = await getGitStatus(payload.repoPath)
    return { code: 0, msg: 'ok', data: status }
  } catch (err) {
    return { code: 1001, msg: String(err), data: null }
  }
})
```

### 5.4 渲染进程调用写法

```typescript
// src/renderer/src/api/git.ts
import type { IpcResponse } from '../types/ipc'

export async function getGitStatus(repoPath: string) {
  const res = await window.electronAPI.invoke<GitStatus>('git:status', { repoPath })
  if (res.code !== 0) throw new Error(res.msg)
  return res.data!
}
```

---

## 6. 本地存储规范

- **存储路径**：主进程通过 `app.getPath('userData')` 获取，不写安装目录
- **数据库文件**：`<userData>/mile-git-management.db`
- **表结构变更**：必须同时提供 `src/main/storage/migrations/` 下的迁移脚本（格式：`<序号>_<描述>.sql`，如 `001_init.sql`）
- **迁移脚本要求**：编号连续唯一、幂等可重跑、含验证 SQL
- **应用启动时自动执行迁移**（`db.ts` 中实现版本检查逻辑）

---

## 7. 设计规范（渲染进程）

### 7.1 设计令牌

- 所有颜色、字体、间距、阴影、圆角统一定义在 `src/renderer/src/styles/tokens.css`
- **禁止在组件 CSS 中硬编码颜色**（如 `color: #1f2328`），一律用 CSS 变量（`color: var(--color-text-primary)`）
- **禁止使用设计令牌外的字号**，只允许 `--text-xs` 到 `--text-2xl`
- **禁止使用间距令牌外的数值**（如 `margin: 13px`），只允许 `--space-1` 到 `--space-16`

### 7.2 基础组件约定（进化柔性 UI，2026-10-28 起）

- React Spectrum 已移除。交互组件统一用 `components/common/`（`Button`、`IconButton`、`ConfirmDialog`、`Segmented`、`Panel`、`ResizeHandle`），业务组件不直接引用 `react-aria-components`
- 基础组件样式在 `styles/ui.css`（类名 `ui-` 前缀，交互状态用 react-aria 的 `data-hovered` / `data-pressed` / `data-focus-visible`）
- `main.tsx` 根层只有 `I18nProvider locale="zh-CN"`；主题由 `<html data-theme>` 控制，`settings:set` 持久化
- 破坏性操作一律用 `ConfirmDialog`，且对话框与触发它的菜单是兄弟节点（菜单关闭时不能把对话框一起卸载）
- 交互元素不嵌套：列表行里的选中按钮、复选框、操作按钮互为兄弟节点
- 设计规格与对比度结果见 `docs/UI重构文档.md`

### 7.3 图标规范

- 使用 Lucide（`lucide-react`）或 Phosphor（`@phosphor-icons/react`）图标集，选一种并统一
- **禁止用 emoji 作为功能图标**
- 图标尺寸：与行内文字配套用 16px，独立展示用 20px

### 7.4 动效规范

- **只允许 `transform` 和 `opacity` 参与动画**，禁止动画 `top`/`left`/`width`/`height`
- 时长范围：150ms（快速反馈）到 300ms（面板展开），禁用超过 300ms 的 UI 动画
- 缓动函数：`cubic-bezier(0.4, 0, 0.2, 1)`，禁用 `linear`

---

## 8. TypeScript 规范

- `tsconfig.web.json` 和 `tsconfig.node.json` 均开启 `strict: true`
- **禁止使用 `any`**，类型不确定时用 `unknown` + 类型守卫
- IPC 入参/出参均需显式类型定义，统一放 `src/renderer/src/types/ipc.ts`（渲染进程）和 `src/main/types/`（主进程）
- `interface` 优先于 `type`（对象类型）；函数类型和联合类型用 `type`

---

## 9. 代码规范

- **import 顺序**：Node 内置模块 → 第三方库 → 项目内部（绝对路径）→ 相对路径
- **组件文件命名**：PascalCase（如 `RepoList.tsx`）
- **工具函数命名**：camelCase（如 `formatCommitDate.ts`）
- **IPC handler 文件**：与 channel 模块对应（`git.ts` 处理 `git:*`）
- **注释**：中文注释用于业务逻辑说明，英文用于代码行内（变量名、函数名用英文）

---

## 10. 开发命令

```bash
# 安装依赖
npm install

# 开发模式（Vite HMR + Electron 热重载）
npm run dev

# TypeScript 类型检查（不编译）
npm run typecheck

# ESLint 检查
npm run lint

# 生产构建
npm run build

# 打包为可安装程序（当前平台）
npm run dist

# 打包 Windows 安装包
npm run dist:win
```

---

## 11. 任务完成验收标准

每次任务完成后，必须满足以下条件才能汇报「完成」：

1. `npm run typecheck` 无报错
2. `npm run lint` 无 error（warning 可接受）
3. `npm run dev` 能正常启动并截图/录屏展示功能
4. 新增 IPC channel 已在 `docs/IPC契约.md`（或 `../docs/IPC契约.md`）中更新
5. 新增/修改表结构已提供迁移脚本
6. 新文件编码为 UTF-8 无 BOM（写完后回读确认无乱码）

---

## 12. 禁止项（红线）

1. **禁止在渲染进程直接调用任何 Node.js API**（必须走 IPC + contextBridge）
2. **禁止硬编码颜色**，必须使用 `tokens.css` 中的 CSS 变量
3. **禁止使用 emoji 作为 UI 图标**（用 Lucide/Phosphor SVG）
4. **禁止将 git 凭据、SSH Key、token 写入 SQLite 或源码**
5. **禁止修改 `contextIsolation` 和 `nodeIntegration` 的值**
6. **破坏性 Git 操作**（`--force`、`reset --hard`、`branch -D`）必须触发 IPC 返回「需用户二次确认」，UI 层弹对话框后才执行
7. **禁止在主进程中操作 DOM**（主进程无 DOM 上下文）
8. **禁止越界修改根目录或其他目录的文件**

---

## 13. 快速索引

| 需要了解 | 文件路径 |
|---|---|
| 主进程入口 | `src/main/index.ts` |
| IPC Bridge（preload） | `src/preload/index.ts` |
| React 渲染入口 | `src/renderer/src/main.tsx` |
| 设计令牌（颜色/字体/间距） | `src/renderer/src/styles/tokens.css` |
| 全局样式 | `src/renderer/src/styles/global.css` |
| 渲染进程类型声明 | `src/renderer/env.d.ts` |
| electron-vite 配置 | `electron.vite.config.ts` |
| 打包配置 | `package.json` → `build` 字段 |
| 主调度规范 | `../CLAUDE.md` |
| IPC 契约文档 | `../docs/IPC契约.md` |
| 数据库设计文档 | `../docs/数据库设计.md` |

---

> 本文件由 Electron 开发 session 维护，内容变更时就地修正并标注日期。
> 主调度 session 在根目录 `CLAUDE.md` 中维护项目整体视图。
> 最后更新：2026-10-28（v2：UI 重构）
