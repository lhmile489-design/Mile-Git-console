// 确认对话框（替代 Spectrum AlertDialog）
// 受控组件：由业务组件持有 isOpen 状态，并且必须渲染在菜单等会被卸载的容器之外。
// 破坏性操作只能在 onConfirm 里调用 IPC，不得在打开对话框前执行。
import React from 'react'
import { Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components'
import { AlertTriangle } from 'lucide-react'
import Button from './Button'

export interface ConfirmDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  title: string
  children: React.ReactNode
  confirmLabel: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
  onConfirm: () => void
}

function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  children,
  confirmLabel,
  cancelLabel = '取消',
  variant = 'danger',
  onConfirm
}: ConfirmDialogProps): React.ReactElement {
  return (
    // 破坏性确认不允许点遮罩关闭，避免误触；Esc 仍可取消
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable={false}
      className="ui-modal-overlay"
    >
      <Modal className="ui-modal">
        <Dialog role="alertdialog" className="ui-dialog">
          {({ close }) => (
            <>
              <div className="ui-dialog-header">
                {variant === 'danger' && (
                  <span className="ui-dialog-icon" aria-hidden="true">
                    <AlertTriangle size={18} />
                  </span>
                )}
                <Heading slot="title" className="ui-dialog-title">
                  {title}
                </Heading>
              </div>
              <div className="ui-dialog-body">{children}</div>
              <div className="ui-dialog-actions">
                <Button variant="ghost" onPress={close} autoFocus>
                  {cancelLabel}
                </Button>
                <Button
                  variant={variant}
                  onPress={() => {
                    close()
                    onConfirm()
                  }}
                >
                  {confirmLabel}
                </Button>
              </div>
            </>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}

export default ConfirmDialog
