// 表单对话框：非破坏性的输入类对话框（重命名、编辑备注等）。
// 提交回调返回 false 表示失败，此时对话框保持打开，让用户修改后重试；其余情况提交后关闭。
// 与 ConfirmDialog 一样是受控组件，必须渲染在会被卸载的容器（菜单等）之外。
import React from 'react'
import { Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components'
import Button from './Button'

export interface FormDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  title: string
  children: React.ReactNode
  submitLabel: string
  submitDisabled?: boolean
  onSubmit: () => void | boolean | Promise<void | boolean>
}

function FormDialog({
  isOpen,
  onOpenChange,
  title,
  children,
  submitLabel,
  submitDisabled = false,
  onSubmit
}: FormDialogProps): React.ReactElement {
  return (
    <ModalOverlay isOpen={isOpen} onOpenChange={onOpenChange} isDismissable className="ui-modal-overlay">
      <Modal className="ui-modal">
        <Dialog className="ui-dialog">
          {({ close }) => (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (submitDisabled) return
                void Promise.resolve(onSubmit()).then((result) => {
                  if (result !== false) close()
                })
              }}
            >
              <div className="ui-dialog-header">
                <Heading slot="title" className="ui-dialog-title">
                  {title}
                </Heading>
              </div>
              <div className="ui-dialog-body">{children}</div>
              <div className="ui-dialog-actions">
                <Button variant="ghost" onPress={close}>
                  取消
                </Button>
                <Button variant="primary" type="submit" isDisabled={submitDisabled}>
                  {submitLabel}
                </Button>
              </div>
            </form>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}

export default FormDialog
