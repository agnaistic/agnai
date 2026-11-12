import { Component, JSX, Show } from 'solid-js'
import { PartialEventEmitter } from './util'
import { Portal } from 'solid-js/web'

export const Dialog: Component<{
  show: boolean
  close: () => void
  emitter?: PartialEventEmitter<'close'>
  class?: string
  children: any

  title?: JSX.Element
  body?: JSX.Element
  bodyClass?: string
  footer?: JSX.Element
}> = (props) => {
  return (
    <Show when={props.show}>
      <Portal>
        <dialog
          class={`fixed left-0 top-0 flex h-[100vh] max-h-[100vh] w-screen items-center justify-center bg-transparent ${
            props.class || ''
          }`}
        >
          <div class={`bg-700 w-full sm:w-1/2 ${props.bodyClass || ''}`}>
            {props.children}

            <Show when={props.footer}>
              <div class="flex w-full justify-center">{props.footer}</div>
            </Show>
          </div>
        </dialog>
      </Portal>
    </Show>
  )
}
