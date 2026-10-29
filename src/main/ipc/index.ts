// IPC handler 统一注册入口
import { registerRepoIpc } from './repo'
import { registerWorkspaceIpc } from './workspace'
import { registerGitIpc } from './git'
import { registerBranchIpc } from './branch'
import { registerRemoteIpc } from './remote'
import { registerLogIpc } from './log'
import { registerSettingsIpc } from './settings'
import { registerWindowIpc } from './window'
import { registerShellIpc } from './shell'

export function registerAllIpc(): void {
  registerRepoIpc()
  registerWorkspaceIpc()
  registerGitIpc()
  registerBranchIpc()
  registerRemoteIpc()
  registerLogIpc()
  registerSettingsIpc()
  registerWindowIpc()
  registerShellIpc()
}
