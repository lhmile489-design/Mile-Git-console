// 两栏工作区：左侧列表卡片（宽度可拖拽并持久化）+ 右侧详情卡片
// 变更视图与历史视图共用，保证两栏宽度一致
import React from 'react'
import { Panel, ResizeHandle } from '../common'
import {
  useAppStore,
  FILE_LIST_WIDTH_MIN,
  FILE_LIST_WIDTH_MAX
} from '../../store/appStore'

interface WorkspaceProps {
  list: React.ReactNode
  detail: React.ReactNode
  listLabel: string
  detailLabel: string
}

function Workspace({ list, detail, listLabel, detailLabel }: WorkspaceProps): React.ReactElement {
  const width = useAppStore((s) => s.fileListWidth)
  const setWidth = useAppStore((s) => s.setFileListWidth)
  const persistWidth = useAppStore((s) => s.persistFileListWidth)

  const style = { '--file-list-width': `${width}px` } as React.CSSProperties

  return (
    <div className="workspace" style={style}>
      <Panel as="section" className="workspace-list" aria-label={listLabel}>
        {list}
      </Panel>
      <ResizeHandle
        value={width}
        min={FILE_LIST_WIDTH_MIN}
        max={FILE_LIST_WIDTH_MAX}
        onChange={setWidth}
        onCommit={() => void persistWidth()}
        label="调整列表宽度"
      />
      <Panel as="section" className="workspace-detail" aria-label={detailLabel}>
        {detail}
      </Panel>
    </div>
  )
}

export default Workspace
