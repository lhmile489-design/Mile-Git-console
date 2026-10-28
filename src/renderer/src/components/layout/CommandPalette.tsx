// 命令面板（Ctrl+K）：搜索并执行命令、切换仓库、切换分支
// 命令来自 commands/registry.ts，与快捷键共用一份列表
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Folder, GitBranch, Search, SquareTerminal } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { COMMANDS, formatShortcut } from '../../commands/registry'

interface PaletteItem {
  id: string
  group: '命令' | '仓库' | '分支'
  label: string
  hint?: string
  icon: React.ReactNode
  run: () => void
}

function useItems(): PaletteItem[] {
  const repos = useAppStore((s) => s.repos)
  const activeRepoId = useAppStore((s) => s.activeRepoId)
  const branches = useAppStore((s) => s.branches)
  const currentBranch = useAppStore((s) => s.gitStatus?.branch ?? '')
  const busy = useAppStore((s) => s.loading.action !== null)

  return useMemo(() => {
    const items: PaletteItem[] = []
    for (const c of COMMANDS) {
      if (c.id === 'palette.open' || !c.enabled()) continue
      items.push({
        id: `cmd:${c.id}`,
        group: '命令',
        label: c.label,
        hint: c.shortcut ? formatShortcut(c.shortcut) : undefined,
        icon: <SquareTerminal size={16} />,
        run: c.run
      })
    }
    for (const r of repos) {
      if (r.id === activeRepoId || r.missing) continue
      items.push({
        id: `repo:${r.id}`,
        group: '仓库',
        label: `切换到仓库：${r.name}`,
        hint: r.path,
        icon: <Folder size={16} />,
        run: () => void useAppStore.getState().selectRepo(r.id)
      })
    }
    if (!busy) {
      for (const b of branches) {
        if (b.isRemote || b.name === currentBranch) continue
        items.push({
          id: `branch:${b.name}`,
          group: '分支',
          label: `切换到分支：${b.name}`,
          icon: <GitBranch size={16} />,
          run: () => void useAppStore.getState().switchBranch(b.name)
        })
      }
    }
    return items
    // COMMANDS 的 enabled() 读 store，依赖下列状态变化重算即可
  }, [repos, activeRepoId, branches, currentBranch, busy])
}

// 所有关键词都出现在标签或提示里才算命中，不区分大小写
function matches(item: PaletteItem, query: string): boolean {
  const hay = `${item.label} ${item.hint ?? ''}`.toLowerCase()
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w))
}

function PaletteBody({ onClose }: { onClose: () => void }): React.ReactElement {
  const items = useItems()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  // 关闭后把焦点还给打开前的元素
  const restoreRef = useRef<Element | null>(document.activeElement)

  const filtered = useMemo(() => items.filter((i) => matches(i, query)), [items, query])

  useEffect(() => {
    inputRef.current?.focus()
    const restore = restoreRef.current
    return () => {
      if (restore instanceof HTMLElement) restore.focus()
    }
  }, [])

  useEffect(() => setActive(0), [query])

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const runItem = (item: PaletteItem | undefined): void => {
    if (!item) return
    onClose()
    item.run()
  }

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (filtered.length === 0 ? 0 : (i + 1) % filtered.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (filtered.length === 0 ? 0 : (i - 1 + filtered.length) % filtered.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      runItem(filtered[active])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  let lastGroup = ''
  return (
    <div
      className="palette-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="palette" role="dialog" aria-modal="true" aria-label="命令面板" onKeyDown={onKeyDown}>
        <div className="palette-search">
          <Search size={16} className="palette-search-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            className="palette-input"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={filtered[active] ? `palette-item-${active}` : undefined}
            placeholder="搜索命令、仓库或分支…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="palette-kbd">Esc</kbd>
        </div>
        <div className="palette-list" id="palette-list" role="listbox" ref={listRef}>
          {filtered.length === 0 && <div className="palette-empty">没有匹配的项目</div>}
          {filtered.map((item, i) => {
            const header = item.group !== lastGroup ? item.group : null
            lastGroup = item.group
            return (
              <React.Fragment key={item.id}>
                {header && (
                  <div className="palette-group" role="presentation">
                    {header}
                  </div>
                )}
                <div
                  id={`palette-item-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={i === active}
                  className={`palette-item${i === active ? ' is-active' : ''}`}
                  onMouseMove={() => setActive(i)}
                  onClick={() => runItem(item)}
                >
                  <span className="palette-item-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="palette-item-label">{item.label}</span>
                  {item.hint && <span className="palette-item-hint">{item.hint}</span>}
                </div>
              </React.Fragment>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function CommandPalette(): React.ReactElement | null {
  const open = useAppStore((s) => s.paletteOpen)
  const setOpen = useAppStore((s) => s.setPaletteOpen)
  if (!open) return null
  return <PaletteBody onClose={() => setOpen(false)} />
}

export default CommandPalette
