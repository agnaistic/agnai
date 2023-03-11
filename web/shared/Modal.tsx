import { Check, X } from 'lucide-solid'
import { Component, Show, JSX } from 'solid-js'
import Button from './Button'

interface Props {
  title?: string | JSX.Element
  show: boolean
  children: JSX.Element
  close: () => void
  footer?: JSX.Element
}

const Modal: Component<Props> = (props) => {
  return (
    <Show when={props.show}>
      <div class="fixed inset-x-0 top-0  items-center justify-center px-4 sm:inset-0 sm:flex sm:items-center sm:justify-center">
        <div class="fixed inset-0 -z-10 opacity-40 transition-opacity">
          <div class="absolute inset-0 bg-black" />
        </div>
        <div class="flex h-screen items-center">
          <div class="my-auto max-h-[85vh] overflow-hidden rounded-lg bg-[var(--bg-900)] shadow-md shadow-black transition-all sm:w-full sm:max-w-lg">
            <div class="flex flex-row justify-between p-4 text-lg font-bold">
              <div>{props.title}</div>
              <div onClick={props.close}>
                <X />
              </div>
            </div>

            {/* 132px is the height of the title + footer*/}
            <div class={`max-h-[calc(85vh-132px)] overflow-y-auto p-4 text-lg`}>
              {props.children}
            </div>

            <Show when={props.footer}>
              <div class="flex w-full flex-row justify-end gap-2 p-4">{props.footer}</div>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  )
}

export default Modal

export const ConfirmModel: Component<{
  show: boolean
  close: () => void
  confirm: () => void
  message: string
}> = (props) => {
  return (
    <Modal
      show={props.show}
      close={props.close}
      title="Confirmation"
      footer={
        <>
          <Button schema="secondary" onClick={props.close}>
            <X /> Cancel
          </Button>

          <Button onClick={props.confirm}>
            <Check /> Confirm
          </Button>
        </>
      }
    >
      <div class="mb-8 flex justify-center">{props.message}</div>
    </Modal>
  )
}
