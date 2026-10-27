// 基础按钮（react-aria-components 交互 + 自绘柔性样式）
import React from 'react'
import { Button as AriaButton, type ButtonProps as AriaButtonProps } from 'react-aria-components'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'md' | 'sm'

export interface ButtonProps extends Omit<AriaButtonProps, 'className' | 'children'> {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  children: React.ReactNode
}

function Button({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonProps): React.ReactElement {
  const cls = ['ui-btn', `ui-btn-${variant}`, `ui-btn-${size}`, className]
    .filter(Boolean)
    .join(' ')
  return (
    <AriaButton {...rest} className={cls}>
      {children}
    </AriaButton>
  )
}

export default Button
