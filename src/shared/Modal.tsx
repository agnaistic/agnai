import { createSignal, Component, Show, JSX } from 'solid-js'
// Component Properties
interface Props {
  title?: string | JSX.Element
  show: boolean
  children: JSX.Element
  footer: JSX.Element
}

const Modal: Component<Props> = (props) => {
  return (
    <Show when={props.show}>
      <div class="fixed inset-x-0 bottom-0 px-4 pb-4 sm:inset-0 sm:flex sm:items-center sm:justify-center">
        <div class="fixed inset-0 -z-10 opacity-40 transition-opacity">
          <div class="absolute inset-0 bg-black" />
        </div>
        <div class="overflow-hidden rounded-lg bg-gray-900 px-4 pt-5 pb-4 shadow-md shadow-black transition-all sm:w-full sm:max-w-lg">
          <div>
            <div class="black mb-4 text-lg font-bold">{props.title}</div>
            <div class="black mb-4 text-lg">{props.children}</div>
            <div class="flex w-full flex-row justify-end gap-2">{props.footer}</div>
          </div>
        </div>
      </div>
    </Show>
  )
}

export default Modal
