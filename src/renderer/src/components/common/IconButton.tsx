// 图标按钮：label 同时作为 aria-label 与悬停提示，无文字的按钮必须提供
import React from 'react'
import { Button as AriaButton, type ButtonProps as AriaButtonProps } from 'react-aria-components'

export interface IconButtonProps
  extends Omit<AriaButtonProps, 'className' | 'children' | 'aria-label'> {
  label: string
  isActive?: boolean
  size?: 'md' | 'sm'
  className?: string
  // 附加在悬停提示后的快捷键文字，如 F5
  hint?: string
  children: React.ReactNode
}

function IconButton({
  label,
  isActive = false,
  size = 'md',
  className,
  hint,
  children,
  ...rest
}: IconButtonProps): React.ReactElement {
  const cls = ['ui-icon-btn', `ui-icon-btn-${size}`, isActive ? 'is-active' : '', className]
    .filter(Boolean)
    .join(' ')
  return (
    <AriaButton {...rest} aria-label={label} className={cls}>
      <span className="ui-icon-btn-inner" title={hint ? `${label}（${hint}）` : label}>
        {children}
      </span>
    </AriaButton>
  )
}

export default IconButton
