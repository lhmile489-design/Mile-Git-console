# UI 微交互主题（2026-10-29）

> 来源模板：`E:\WebApp\Claude Fable 5 Max\style-templates\pages\16-micro-interactions.html`
> 取代：`docs/UI重构文档.md` 中的「进化柔性 UI」视觉部分（组件结构、交互约定不变）。
> 令牌单一来源：`src/renderer/src/styles/tokens.css`。

## 1. 风格要点

- 50 到 100ms 的轻快反馈：位移 70ms，颜色、阴影、边框 90ms。
- 按下缩小（按钮 96%，图标按钮 90%，列表行 98%），松开时用回弹曲线 `--ease-pop` 恢复。
- 纯色按钮和卡片，不再使用竖向渐变与内高光。
- 卡片只用两级柔和投影（`--shadow-raise` / `--shadow-raise-hover`）加 1px 淡描边。
- 开关旋钮带过冲，开启后轨道变为成功绿。
- 焦点环 3px 主色。

## 2. 令牌映射

| 模板变量 | 应用令牌 | 浅色值 | 深色值 |
|---|---|---|---|
| `--bg` | `--color-bg-base` | `#F6F7FB` | `#11131A` |
| `--card` | `--color-bg-surface` | `#FFFFFF` | `#1A1D27` |
| `--ink` | `--color-text-primary` | `#1B1F2E` | `#E8EAF2` |
| `--muted` | `--color-text-secondary` | `#4C5265` | `#B4B9C9` |
| `--line` | `--color-border-highlight` | `rgba(27,31,46,.1)` | 半透明白 |
| `--primary` | `--color-primary` | `#2563EB` | `#60A5FA` |
| `--primary-deep` | `--color-primary-hover` | `#1D4ED8` | `#93C5FD` |
| `--success` | `--color-feedback-success` | `#15803D` | `#22C55E` |
| `--dur-fast` | `--duration-instant` | 70ms | 同 |
| `--dur` | `--duration-fast` | 90ms | 同 |
| `--pop` | `--ease-pop` | `cubic-bezier(.34,1.56,.64,1)` | 同 |
| `--shadow` | `--shadow-raise` | `0 4px 14px rgba(27,31,46,.07)` | 加深 |
| `--shadow-hover` | `--shadow-raise-hover` | `0 8px 22px rgba(27,31,46,.12)` | 加深 |

模板只有浅色，深色按同一套语义推导。

## 3. 字体

- 标题：Manrope（`--font-family-display`，打包 600/700/800）。
- 正文：Inter（`--font-family-ui`，打包 400/500/600）。
- 中文回退 `Mile CJK` 别名（见 `docs/踩坑记录.md` 第 6 条）。
- CSP 禁止外部资源，字体通过 `@fontsource/manrope`、`@fontsource/inter` 本地打包，在 `main.tsx` 引入 latin 子集。Nunito 依赖已不再引用。

## 4. 对比度（WCAG AA，正文 >= 4.5:1）

与模板取值的差异都是为了满足对比度：

| 组合 | 模板值 | 应用值 | 对比度 |
|---|---|---|---|
| 主色文字 / 选中底 | 无 | 选中底 `#ECF2FE` | 4.60 |
| 新增状态色 / 凹陷底 | `#15803D` | `#166534` | 6.26 |
| 成功态按钮白字 | `#22C55E`（3.30） | `#15803D` | 5.02 |
| 主按钮白字 / `#2563EB` | 同 | 同 | 5.17 |
| 深色主按钮 `#0B1430` / `#60A5FA` | 无 | 同 | 7.14 |
| 开关关闭轨道 / 卡片（非文字，>= 3:1） | `#CDD1DE` | `#8A90A2` | 3.19 |

深色模式下所有文字组合均 >= 4.5:1。

## 5. 微交互清单

| 元素 | 悬停 | 按下 | 位置 |
|---|---|---|---|
| 主按钮 | 加深 + 上浮 1px + 阴影加深 | 缩到 96% | `ui.css` `.ui-btn` |
| 次要按钮 | 描边转蓝 + 上浮 1px | 缩到 96% | 同上 |
| 图标按钮 | 旋转 8° + 上浮 1px，图标转主色 | 缩到 90% | `.ui-icon-btn` |
| 提交成功 | 背景转成功绿，对勾以回弹弹出（220ms） | | `.ui-btn.is-success` |
| 列表行（仓库 / 文件 / 提交 / 命令面板） | 淡蓝底 | 缩到 98% | `components.css` 微交互主题层 |
| 分支药丸 | 描边转蓝 + 上浮 | 缩到 96% | 同上 |
| 欢迎页、设置页卡片 | 上浮 3px + 阴影加深 + 描边淡蓝 | | 同上 |
| 计数徽标 | 数字变化时弹出 | | 同上 |
| 开关 | | 旋钮回弹，开启后轨道转绿 | `.ui-switch` |

## 6. 约束（不变）

- 动画只用 `transform` / `opacity`；`prefers-reduced-motion` 与「减少视觉效果」开关关闭全部动画。
- 列表进场动画的 fill-mode 用 `backwards`：用 `both` 时结束帧的 `transform` 会一直保留，覆盖 `:active` 的缩放。
