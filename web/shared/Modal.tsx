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
      <div class="fixed inset-x-0 top-2 px-4 sm:inset-0 sm:flex sm:items-center sm:justify-center">
        <div class="fixed inset-0 -z-10 opacity-40 transition-opacity">
          <div class="absolute inset-0 bg-black" />
        </div>
        <div class="rounded-lg bg-gray-900 shadow-md shadow-black transition-all sm:w-full sm:max-w-lg">
          <div class="">
            <div class="flex flex-row justify-between p-4 text-lg font-bold">
              <div>{props.title}</div>
              <div onClick={props.close}>
                <X />
              </div>
            </div>

            <div class="max-h-[90vh] overflow-y-auto p-4 text-lg sm:max-h-[75vh] ">
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

/**
 * Use when a sticky footer is not wanted or required. Otherwise use the `footer` property.
 */
export const ModalFooter: Component<{ children: JSX.Element }> = (props) => (
  <div class="mt-2 flex w-full flex-row justify-end gap-2">{props.children}</div>
)

export default Modal

export const ConfirmModel: Component<{
  show: boolean
  close: () => void
  confirm: () => void
  message: string
}> = (props) => {
  return (
    <Modal show={props.show} close={props.close} title="Confirmation">
      <div class="mb-8 flex justify-center">{props.message}</div>

      <ModalFooter>
        <Button schema="secondary" onClick={props.close}>
          <X /> Cancel
        </Button>

        <Button onClick={props.confirm}>
          <Check /> Confirm
        </Button>
      </ModalFooter>
    </Modal>
  )
}
