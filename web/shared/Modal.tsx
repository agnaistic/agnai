import { Component, Show, JSX } from 'solid-js'

interface Props {
  title?: string | JSX.Element
  show: boolean
  children: JSX.Element
}

const Modal: Component<Props> = (props) => {
  return (
    <Show when={props.show}>
      <div class="fixed inset-x-0 top-2 px-4 sm:inset-0 sm:flex sm:items-center sm:justify-center">
        <div class="fixed inset-0 -z-10 opacity-40 transition-opacity">
          <div class="absolute inset-0 bg-black" />
        </div>
        <div class="max-h-screen overflow-hidden rounded-lg bg-gray-900 p-4 shadow-md shadow-black transition-all sm:w-full sm:max-w-lg">
          <div>
            <div class="black mb-4 text-lg font-bold">{props.title}</div>
            <div class="black overflow-y-auto text-lg">{props.children}</div>
          </div>
        </div>
      </div>
    </Show>
  )
}

export const ModalFooter: Component<{ children: JSX.Element }> = (props) => (
  <div class="mt-2 flex w-full flex-row justify-end gap-2">{props.children}</div>
)

export default Modal
