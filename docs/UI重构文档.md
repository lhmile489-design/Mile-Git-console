# Mile Git Management · UI 重构文档（进化柔性 UI）

> 版本：v1 · 2026-10-27
> 风格参考：`E:\WebApp\Claude Fable 5 Max\style-templates\pages\19-soft-ui-evolution.html`
> 作用范围：渲染进程（`src/renderer/`）。主进程、preload、IPC 契约不变。
> 状态：已完成（2026-10-28）。5 个阶段全部实施，提交记录见第 12 节。

---

## 1. 目标

当前 UI 是 GitHub Primer 配色加 React Spectrum 默认组件，视觉层级平、没有品牌感。本次重构把整个应用换成「进化柔性 UI」风格：

- 柔和的双层阴影做出凸起和凹陷，替代满屏的 1px 灰线分隔。
- 卡片化的面板，面板之间留出背景色缝隙，层级靠深度而不是边框来区分。
- 保留 4.5:1 以上的正文对比度，避免旧式新拟态灰底灰字的可读性问题。
- 动效统一 200 到 300ms，只动 `transform` 和 `opacity`。

不在本次范围：新功能（搜索框、部分暂存等 P2 任务）、IPC 改动、主进程改动。

## 2. 已确认的决策

| 问题 | 决策 |
|---|---|
| 主题 | 浅色为主，配套深色。默认跟随系统，设置页可手动切换 |
| 组件库 | 移除 React Spectrum，改用 `react-aria-components`（已安装 1.22.0）加自绘样式 |
| 布局 | 保留三栏结构（仓库栏 / 文件列表 / Diff），改成卡片化 |
| 字体 | 本地打包 Nunito，中文回退系统字体，不依赖网络 |

## 3. 与模板的差异（桌面应用适配）

模板是一个营销落地页，直接照搬会让桌面工具变得又大又松。以下几处有意偏离模板：

| 项 | 模板 | 本应用 | 原因 |
|---|---|---|---|
| 正文字号 | 17px | 14px（`--text-sm`） | 桌面工具信息密度高；且项目字号阶梯只允许 12/14/16/20/24/32 |
| 按钮高度 | 46px | 32px，列表内 28px | 鼠标操作不需要 44px 触控区；46px 会挤掉工具栏空间 |
| 卡片内边距 | 22 到 28px | 12 到 16px | 同上 |
| 开关滑块动画 | 动画 `left` | 改用 `transform: translateX()` | 项目规则只允许动 `transform` / `opacity` |
| 主色 | `#0F609B` | 沿用 | 对比度已验证（见 4.4） |
| 粉色 pastel | `#FFB6C1` | 用作「删除/冲突」系的浅底 | Git 状态色需要红、绿、黄、蓝、橙五色，模板三色不够，补了黄和橙 |

另有两处与全局通用规则（`~/.claude/rules/website-skill.md`）冲突，按你本次指定的风格优先，在此记录：

- 圆角用 10px（控件）和 16px（卡片），通用规则建议只用 6/8px。
- 卡片同时用 1px 白色描边和阴影。这个白色描边是柔性 UI 的「高光边」，是风格的核心部分，不是装饰性的重复。

## 4. 设计令牌（`tokens.css` 全量替换）

令牌名保留现有的 `--color-*` 体系，组件 CSS 里的变量引用大部分不用改，只是值变了。新增的令牌标了「新」。

### 4.1 浅色

```css
:root {
  /* 背景层级：base 是窗口底色，surface 是卡片，inset 是凹陷区（输入框、diff 底） */
  --color-bg-base: #E9EFF6;
  --color-bg-surface: #FBFDFF;
  --color-bg-surface-end: #F2F7FC;   /* 新：卡片顶到底的渐变终点 */
  --color-bg-inset: #E1E9F2;         /* 新 */
  --color-bg-hover: #F1F6FB;         /* 新 */
  --color-bg-selected: #D9EBF8;      /* 新 */
  --color-bg-sidebar: #E9EFF6;       /* 侧栏与窗口同色，靠卡片浮起来区分 */
  --color-bg-overlay: #FBFDFF;

  --color-text-primary: #1F2A37;
  --color-text-secondary: #43566B;
  --color-text-muted: #56677A;       /* 旧值 #9198a1 在白底只有 2.91:1，不达标 */
  --color-text-on-primary: #FFFFFF;

  --color-primary: #0F609B;
  --color-primary-hover: #0B4A73;
  --color-primary-soft: #D9EBF8;     /* 新：次要按钮底、选中态 */
  --color-primary-start: #1573B4;    /* 新：主按钮渐变起点 */

  --color-border-default: #C9D7E4;   /* 只用于装饰性分隔，不用于需要被看见的控件边界 */
  --color-border-strong: #687B8F;    /* 新：输入框边框，需满足 3:1 */
  --color-border-highlight: #FFFFFF; /* 新：卡片高光描边 */

  --color-danger: #B4233C;
  --color-danger-bg: #FFE3E9;

  /* Git 状态：前景色 + 浅底，用于状态徽标 */
  --color-git-added: #1C5E2A;      --color-git-added-bg: #DFF7DF;
  --color-git-removed: #93283C;    --color-git-removed-bg: #FFE3E9;
  --color-git-modified: #7A5000;   --color-git-modified-bg: #FFF1CC;
  --color-git-untracked: #0B4A73;  --color-git-untracked-bg: #D9EFFA;
  --color-git-conflict: #8F3608;   --color-git-conflict-bg: #FFE6D5;

  /* Diff 行底色 */
  --color-diff-add-line: #E6F6E6;    /* 新 */
  --color-diff-del-line: #FDEBEE;    /* 新 */

  /* 阴影：凸起、凹陷、高光三件套 */
  --shadow-raise: 0 2px 4px rgba(31, 42, 55, 0.08), 0 12px 28px -12px rgba(31, 42, 55, 0.22);
  --shadow-raise-hover: 0 4px 8px rgba(31, 42, 55, 0.08), 0 20px 36px -14px rgba(31, 42, 55, 0.28);
  --shadow-press: inset 0 2px 6px rgba(31, 42, 55, 0.14);
  --shadow-highlight: inset 0 1px 0 rgba(255, 255, 255, 0.9);
  --shadow-primary: 0 2px 4px rgba(15, 96, 155, 0.35), 0 12px 22px -10px rgba(15, 96, 155, 0.55);

  --radius-sm: 6px;    /* 徽标、小标签 */
  --radius-md: 10px;   /* 按钮、输入框、列表项 */
  --radius-lg: 16px;   /* 卡片面板 */
  --radius-pill: 999px;

  --ease-soft: cubic-bezier(0.33, 1, 0.45, 1);
  --transition-fast: 150ms var(--ease-soft);
  --transition-normal: 240ms var(--ease-soft);
  --transition-slow: 300ms var(--ease-soft);

  --panel-gap: 12px;   /* 新：卡片之间露出的背景缝隙 */
}
```

### 4.2 深色

深色版不是浅色反转。底色用带蓝调的深灰，卡片比底色亮一级；高光描边改成很淡的白，凹陷阴影加深。

```css
[data-theme='dark'] {
  --color-bg-base: #161C24;
  --color-bg-surface: #1E2631;
  --color-bg-surface-end: #1A212B;
  --color-bg-inset: #121820;
  --color-bg-hover: #252F3C;
  --color-bg-selected: #17324A;
  --color-bg-sidebar: #161C24;
  --color-bg-overlay: #1E2631;

  --color-text-primary: #E4EBF3;
  --color-text-secondary: #A9B7C6;
  --color-text-muted: #8D9CAE;
  --color-text-on-primary: #0B1A27;

  --color-primary: #5AA9E6;
  --color-primary-hover: #A9D3F5;
  --color-primary-soft: #17324A;
  --color-primary-start: #7BBCEC;

  --color-border-default: #2C3745;
  --color-border-strong: #7A8CA0;
  --color-border-highlight: rgba(255, 255, 255, 0.06);

  --color-danger: #FF7A8A;
  --color-danger-bg: #3A1C25;

  --color-git-added: #7BD88F;      --color-git-added-bg: #183224;
  --color-git-removed: #FF8FA3;    --color-git-removed-bg: #3A1C25;
  --color-git-modified: #F2C14E;   --color-git-modified-bg: #33290F;
  --color-git-untracked: #7DC4F0;  --color-git-untracked-bg: #14304A;
  --color-git-conflict: #FFA26B;   --color-git-conflict-bg: #3A2414;

  --color-diff-add-line: #1B3326;
  --color-diff-del-line: #3A1F27;

  --shadow-raise: 0 2px 4px rgba(0, 0, 0, 0.30), 0 12px 28px -12px rgba(0, 0, 0, 0.60);
  --shadow-raise-hover: 0 4px 8px rgba(0, 0, 0, 0.30), 0 20px 36px -14px rgba(0, 0, 0, 0.70);
  --shadow-press: inset 0 2px 6px rgba(0, 0, 0, 0.45);
  --shadow-highlight: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  --shadow-primary: 0 2px 4px rgba(0, 0, 0, 0.35), 0 10px 20px -10px rgba(90, 169, 230, 0.45);
}
```

跟随系统的写法与现在一致：`@media (prefers-color-scheme: dark) { :root:not([data-theme]) { ... } }` 内复制同一组值。

### 4.3 字号、间距

字号阶梯和 4px 间距网格保持不变（12/14/16/20/24/32，4/8/12/16/24/32/48/64）。字重按模板调整：

| 用途 | 字号 | 字重 |
|---|---|---|
| 正文、列表项 | 14 | 600 |
| 面板标题 | 14 | 800 |
| 区块标签（如「暂存的更改」） | 12 | 800，字距 0.08em |
| 仓库名（工具栏） | 16 | 800 |
| 欢迎页标题 | 24 | 800 |
| 代码、diff、哈希 | 12 / 14 | 400，等宽字体 |

### 4.4 对比度验证结果

已用 WCAG 相对亮度公式逐对计算，浅色和深色共 48 对文字与底色组合全部 ≥ 4.5:1。最低的几项：

| 组合 | 浅色 | 深色 |
|---|---|---|
| muted 文字 / 选中底 | 4.75 | 4.71 |
| muted 文字 / 凹陷底 | 4.74 | 6.37 |
| muted 文字 / 窗口底 | 5.02 | 6.12 |
| 主色 / 卡片底 | 6.50 | 5.99 |

输入框边框 `--color-border-strong` 对卡片底：浅色 4.27、深色 4.42，满足非文字元素 3:1 的要求。`--color-border-default` 只有 1.44，所以只能用在装饰性分隔线上。

## 5. 字体

- 安装 `@fontsource/nunito`（版本以安装时为准），在 `main.tsx` 只引入用到的字重：`400`、`600`、`700`、`800`。字体文件会被 Vite 打进渲染包，离线可用。
- Nunito 没有中文字形，中文自动落到回退字体：

```css
--font-family-ui: 'Nunito', 'PingFang SC', 'Microsoft YaHei UI', 'Microsoft YaHei', system-ui, sans-serif;
--font-family-mono: 'Cascadia Code', 'JetBrains Mono', 'Consolas', monospace;
```

- 风险：Nunito 的数字和拉丁字母比微软雅黑圆、略宽，中英混排时基线可能有 1px 偏差。实施后在文件列表和提交历史里截图确认。

## 6. 布局

### 6.1 整体结构

```
┌──────────────────────────────────────────────────────────────┐
│ 标题栏（38px，与窗口底同色，无下边线）                          │
├────────────┬─────────────────────────────────────────────────┤
│            │ ┌─ 工具栏卡片 ────────────────────────────────┐ │
│  仓库栏    │ │ 仓库名  分支选择  Fetch Pull Push   视图切换 │ │
│  卡片      │ └─────────────────────────────────────────────┘ │
│            │ ┌─ 文件列表卡片 ──┐ ┌─ Diff 卡片 ─────────────┐ │
│  （浮起，  │ │ 暂存的更改       │ │ 文件路径          统计   │ │
│  左上下    │ │  ...             │ │ ┌─ 凹陷代码区 ────────┐ │ │
│  留 12px） │ │ 更改             │ │ │                     │ │ │
│            │ │  ...             │ │ └─────────────────────┘ │ │
│            │ ├─ 提交区 ─────────┤ │                         │ │
│            │ │ 输入框  [提交]   │ │                         │ │
│            │ └──────────────────┘ └─────────────────────────┘ │
└────────────┴─────────────────────────────────────────────────┘
```

- 窗口底色是 `--color-bg-base`，所有面板是浮在上面的卡片，卡片之间留 `--panel-gap`（12px）。
- 结构与现在对应：仓库栏 = `Sidebar`，工具栏 = `Toolbar`，文件列表 = `StatusPanel`，Diff = `DiffViewer`。
- 变化一：提交区 `CommitPanel` 从底部通栏移到文件列表卡片的底部。提交只针对暂存的文件，放在文件列表下方，视线和操作路径更短。Diff 区因此获得完整高度。
- 变化二：文件列表卡片宽度固定 320px，可拖拽调整（240 到 480px），宽度持久化到 `settings`。拖拽这一项需要新增一个设置键 `layout.fileListWidth`，不涉及新 IPC。

### 6.2 卡片样式

```css
.panel {
  background: linear-gradient(180deg, var(--color-bg-surface), var(--color-bg-surface-end));
  border: 1px solid var(--color-border-highlight);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-raise), var(--shadow-highlight);
  overflow: hidden;
}
```

卡片内部不再套卡片。卡片内的分区（如「暂存的更改」与「更改」）用区块标签加 8px 间距区分，不加边框。

## 7. 组件规格

### 7.1 基础控件

| 控件 | 规格 |
|---|---|
| 主按钮 | 高 32，圆角 10，`--color-primary-start` 到 `--color-primary` 的竖向渐变，`--shadow-primary` + 高光。悬停上移 1px，按下回到原位并换成 `--shadow-press` |
| 次要按钮 | `--color-primary-soft` 底，`--color-primary-hover` 字色，带高光 |
| 幽灵按钮 | 透明底，悬停 `--color-bg-hover` |
| 危险按钮 | 只在确认对话框里出现，`--color-danger` 实底 |
| 图标按钮 | 28×28，圆角 8，悬停出现凸起阴影。图标 16px，继续用 Lucide，`strokeWidth={1.75}` |
| 输入框 / 文本域 | `--color-bg-inset` 底，`--shadow-press` 内阴影，1.5px `--color-border-strong` 边框。聚焦时边框换主色，外加 3px 主色焦点环 |
| 分段切换（变更 / 历史） | 外框是凹陷槽（inset 底 + press 阴影），选中项是浮起的白色滑块，滑块用 `transform` 平移 |
| 开关（设置页） | 同模板，滑块改用 `transform: translateX(26px)` |
| 状态徽标 | 圆角 6，字号 12，字重 800，Git 状态色的前景加浅底，如 `M` 用 modified 黄 |
| 焦点 | 所有可交互元素 `:focus-visible` 时显示 2px 主色外描边，偏移 2px |

### 7.2 各区域

**标题栏 `Titlebar`**
- 与窗口底同色，去掉下边线。左侧应用图标放进 26×26 的浮起圆角块里（模板 `.brand .mark` 的做法）。
- 窗口按钮保持系统习惯的方形热区；关闭按钮悬停用 `--color-danger` 底。

**仓库栏 `Sidebar`**
- 整体是一张卡片，距窗口左、上、下各 12px。
- 仓库项高 40px，两行：仓库名（14/700）+ 路径（12/600，muted，中间省略）。
- 选中项是 `--color-bg-selected` 底加左侧 3px 主色竖条；悬停项 `--color-bg-hover`。
- 底部「导入仓库」改成次要按钮，占满宽度。

**工具栏 `Toolbar`**
- 一张横向卡片，高 52px。
- 分支选择器做成药丸形按钮：分支图标 + 分支名 + ahead/behind 小徽标。
- Fetch、Pull、Push 合并成一个按钮组：共享一个圆角外框，中间用 1px 分隔。Push 有待推送的提交时显示数量徽标。
- 右侧是分段切换和刷新按钮。

**文件列表 `StatusPanel`**
- 两个分区：「暂存的更改」和「更改」，区块标签右侧显示数量徽标，以及「全部暂存 / 全部取消」幽灵按钮。
- 文件项高 32px：状态徽标 + 文件名（600）+ 目录（muted），悬停时右侧淡入操作按钮（暂存、丢弃）。
- 选中文件项用 `--color-bg-selected` 底。
- 空状态：圆角图标块 + 一句说明，例如「工作区很干净」。

**提交区 `CommitPanel`**
- 位于文件列表卡片底部，上方用 1px `--color-border-default` 分隔。
- 摘要输入框单行，描述文本域默认 2 行，可展开。
- 提交按钮是主按钮，文案带暂存数量：「提交 3 个文件」。暂存区为空时禁用，并在按钮下方说明原因。

**Diff `DiffViewer`**
- 卡片头：文件路径 + `+12 −3` 统计徽标 + 「暂存 / 取消暂存」按钮。
- 代码区是凹陷容器（inset 底 + press 阴影，圆角 10），距卡片边 12px。
- 增删行用 `--color-diff-add-line` / `--color-diff-del-line` 底，行号列用 muted 色。
- hunk 头做成一条细药丸标签，不再是整行灰底。

**提交历史 `CommitHistory`**
- 左侧提交列表卡片，右侧详情卡片，与变更视图的两栏比例一致。
- 提交项：摘要（600）、第二行作者 + 相对时间 + 短哈希（等宽、muted）。有 tag 时显示蓝色徽标。
- 详情卡片顶部是一块浮起的摘要区：完整信息、作者、日期、统计；下方是文件列表，点击后在下方凹陷区显示 diff。

**设置页 `SettingsPage`**
- 居中的单列卡片组，最大宽度 640px。每组设置一张卡片（外观、Git、关于）。
- 主题选择从下拉改成三个可选卡片（浅色 / 深色 / 跟随系统），每张卡片里放一个缩略的配色预览。

**欢迎页 `Welcome`**
- 居中一张大卡片：64×64 的浮起图标块、24/800 标题、一句说明、主按钮「导入仓库」。

**确认对话框（Discard、Force Push、移除仓库）**
- 遮罩：`rgba(31, 42, 55, 0.35)`，加 4px 背景模糊（只用在固定定位的遮罩上）。
- 对话框是一张卡片，最大宽 420px，进入动画是 `opacity` 0 到 1 加 `translateY(8px)` 到 0，240ms。
- 按钮顺序：取消在左（幽灵），危险操作在右（危险按钮）。默认焦点放在「取消」上。

**反馈提示 `FeedbackBars`**
- 从现在的通栏条改成右下角浮起的提示卡片，错误不自动消失，普通提示 3 秒后消失。
- 卡片左侧有状态色竖条，状态用图标加文字表达，不只靠颜色。

### 7.3 动效清单

| 场景 | 动效 | 时长 |
|---|---|---|
| 按钮悬停 / 按下 | `translateY(-1px)` / 归位，阴影切换 | 150ms |
| 卡片、列表项悬停 | 背景色、阴影切换 | 150ms |
| 分段切换滑块 | `translateX` | 240ms |
| 对话框进入 | `opacity` + `translateY` | 240ms |
| 提示卡片进入 / 离开 | `opacity` + `translateX` | 240ms |
| 视图切换（变更 / 历史） | 内容区 `opacity` 淡入 | 200ms |

`prefers-reduced-motion: reduce` 时全部关闭过渡和动画。

## 8. React Spectrum 迁移

当前用到 Spectrum 的位置只有 4 个文件：

| 文件 | 用到的组件 | 替换为（`react-aria-components`） |
|---|---|---|
| `main.tsx` | `Provider`、`defaultTheme` | 删除 Provider；用 `I18nProvider locale="zh-CN"` 包裹 |
| `ActionBar.tsx` | `ActionButton`、`DialogTrigger`、`AlertDialog` | `Button`、`DialogTrigger`、`ModalOverlay` + `Modal` + `Dialog` |
| `StatusPanel.tsx` | `ActionButton`、`AlertDialog` | 同上 |
| `Sidebar.tsx` | `ActionButton`、`DialogTrigger`、`AlertDialog` | 同上 |

做法：在 `components/common/` 下新建几个自绘的基础组件，业务组件只引用它们，不直接引用 `react-aria-components`：

- `Button.tsx`（variant: primary / secondary / ghost / danger，size: md / sm）
- `IconButton.tsx`
- `ConfirmDialog.tsx`（替代三处 `AlertDialog`，props：标题、正文、确认文案、`onConfirm`）
- `Segmented.tsx`
- `Panel.tsx`（卡片容器）

`ConfirmDialog` 必须保留现有的约束：对话框挂在菜单之外（`ActionBar.tsx` 第 99 行注释说明的问题），以及破坏性操作必须经过确认后才调用 IPC。

全部替换完成后从 `package.json` 移除 `@adobe/react-spectrum`、`@react-spectrum/provider`、`@spectrum-css/vars`。上次构建渲染包转换了 4018 个模块，移除后预计会明显减少，实施后以构建输出为准。

## 9. 实施阶段

每个阶段结束都跑 `npm run typecheck`、`npm run lint`、`npm run build`，并在 `npm run dev` 下截图浅色和深色两张。

| 阶段 | 内容 | 涉及文件 |
|---|---|---|
| 1. 令牌与字体 | 替换 `tokens.css`；安装并引入 Nunito；`global.css` 调整字体与背景 | `styles/tokens.css`、`styles/global.css`、`main.tsx`、`package.json` |
| 2. 基础组件 | 新建第 8 节的 5 个基础组件 | `components/common/*` |
| 3. 布局骨架 | 卡片化三栏、提交区移位、文件列表可拖拽宽度 | `App.tsx`、`styles/global.css`、`styles/components.css` |
| 4. 逐区域改造 | 按 7.2 改造标题栏、仓库栏、工具栏、文件列表、Diff、历史、设置、欢迎页、提示 | 各组件 `.tsx` 与 `components.css` 对应区块 |
| 5. 移除 Spectrum | 替换剩余用法、删除依赖、`npm install` 后重新构建 | `main.tsx`、`package.json`、`package-lock.json` |

`components.css` 现在有 1208 行、189 个类名。阶段 3 和 4 改到哪个区域就重写哪个区块，不一次性整体重写，避免中间状态无法运行。

## 10. 验收标准

1. typecheck、lint、build 全部通过，无新增 warning。
2. 浅色、深色、跟随系统三种模式切换正常，重启后保持选择，首屏没有颜色闪烁。
3. 组件 CSS 中没有硬编码颜色值：`grep -rnE "#[0-9a-fA-F]{3,8}\b" src/renderer/src/styles/components.css src/renderer/src/components` 无结果（`tokens.css` 除外）。
4. 所有可交互元素都能用键盘 Tab 到达，焦点环可见。
5. 三个破坏性操作（丢弃、强制推送、移除仓库）仍然必须经过确认对话框。
6. 窗口在最小尺寸 1024×700 下没有横向滚动，没有被截断的控件。
7. 开启系统「减少动画」后，界面没有过渡动画。
8. `package.json` 中不再有 Spectrum 相关依赖。

## 11. 已确认事项（2026-10-27）

1. 提交区从底部通栏移到文件列表卡片底部（6.1 变化一）：采用。
2. 文件列表宽度可拖拽（240 到 480px）并记住宽度（6.1 变化二）：采用。
3. 图标继续用 Lucide，线宽统一 1.75：采用。

## 12. 实施记录

分支 `refactor/soft-ui`，每个阶段单独提交：

| 提交 | 内容 |
|---|---|
| `dc115c9` | 修复代码审查发现的 3 个 Critical 问题（重构前置） |
| `c792ab3` | 阶段 1：设计令牌与 Nunito 字体 |
| `cd80029` | 阶段 2：基础组件 |
| `d343ddd` | 阶段 3：卡片化布局骨架、列表宽度拖拽与持久化 |
| `3c41599` | 阶段 4 第一批：标题栏、仓库栏，修复中文 600 字重落到粗体 |
| `6e5e2d8` | 阶段 4 第二批：工具栏、文件列表 |
| `38240b0` | 阶段 4 第三批：提交区、Diff、提交历史 |
| `57c1658` | 阶段 4 第四批：设置页、欢迎页、提示卡片 |
| `8dca06c` | 阶段 5：移除 React Spectrum |

与计划的偏差：

- 提示条改成右下角浮动提示卡片，挂在 App 根层，没有仓库时也能显示错误。
- 中文字体新增别名 `Mile CJK`（`global.css`），把 400 到 600 映射到微软雅黑 UI 常规体。原因见 `docs/踩坑记录.md`。
- 渲染进程构建模块数从 4018 降到 2927。
