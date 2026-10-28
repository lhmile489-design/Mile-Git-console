// 基础按钮（react-aria-components 交互 + 自绘柔性样式）
import React, { useEffect, useRef } from 'react'
import { Button as AriaButton, type ButtonProps as AriaButtonProps } from 'react-aria-components'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'md' | 'sm'

export interface ButtonProps extends Omit<AriaButtonProps, 'className' | 'children'> {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  // 悬停提示（如快捷键）；react-aria 的 Button 不透传 title，这里经 ref 写到 DOM 上
  hint?: string
  children: React.ReactNode
}

function Button({
  variant = 'secondary',
  size = 'md',
  className,
  hint,
  children,
  ...rest
}: ButtonProps): React.ReactElement {
  const cls = ['ui-btn', `ui-btn-${variant}`, `ui-btn-${size}`, className]
    .filter(Boolean)
    .join(' ')
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (hint) el.title = hint
    else el.removeAttribute('title')
  }, [hint])
  return (
    <AriaButton {...rest} ref={ref} className={cls}>
      {children}
    </AriaButton>
  )
}

export default Button
