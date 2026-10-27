// 分段切换：凹陷槽 + 浮起滑块，滑块只用 transform 平移
import React from 'react'
import { ToggleButton, ToggleButtonGroup } from 'react-aria-components'

export interface SegmentedOption<K extends string> {
  id: K
  label: string
  icon?: React.ReactNode
}

export interface SegmentedProps<K extends string> {
  options: SegmentedOption<K>[]
  value: K
  onChange: (value: K) => void
  'aria-label': string
}

function Segmented<K extends string>({
  options,
  value,
  onChange,
  'aria-label': ariaLabel
}: SegmentedProps<K>): React.ReactElement {
  const index = Math.max(
    0,
    options.findIndex((o) => o.id === value)
  )
  // 选项数量与选中下标交给 CSS 计算滑块宽度和位移
  const style = { '--seg-count': options.length, '--seg-index': index } as React.CSSProperties

  return (
    <ToggleButtonGroup
      aria-label={ariaLabel}
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[value]}
      onSelectionChange={(keys) => {
        const picked = options.find((o) => keys.has(o.id))
        if (picked && picked.id !== value) onChange(picked.id)
      }}
      className="ui-segmented"
      style={style}
    >
      <span className="ui-segmented-thumb" aria-hidden="true" />
      {options.map((o) => (
        <ToggleButton key={o.id} id={o.id} className="ui-segmented-item">
          {o.icon}
          {o.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}

export default Segmented
