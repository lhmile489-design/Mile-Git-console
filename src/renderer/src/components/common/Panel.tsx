// 卡片容器：浮起的柔性面板。卡片内部不再嵌套 Panel
import React from 'react'

export interface PanelProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'div' | 'section' | 'aside'
}

function Panel({ as: Tag = 'div', className, children, ...rest }: PanelProps): React.ReactElement {
  return (
    <Tag {...rest} className={['ui-panel', className].filter(Boolean).join(' ')}>
      {children}
    </Tag>
  )
}

export default Panel
