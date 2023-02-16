import { Component, createEffect, For } from 'solid-js'
import { Toast, toastStore } from './store'

const bgColor = {
  default: 'bg-gray-500',
  error: 'bg-red-600',
  success: 'bg-green-600',
  warn: 'bg-orange-600',
} satisfies { [key in Toast['type']]: string }

const Toasts: Component = () => {
  const state = toastStore()

  return (
    <div class="absolute bottom-2 right-2 flex w-80 flex-col gap-2">
      <For each={state.toasts}>{(toast) => <Single toast={toast} />}</For>
    </div>
  )
}

const Single: Component<{ toast: Toast }> = ({ toast: { id, message, type } }) => {
  const bg = bgColor[type]
  const onClick = () => toastStore.remove(id)
  return (
    <div class="flex flex-row">
      <div class={`${bg} w-4 rounded-l-lg p-2`}></div>
      <div class={`rounded-r-lg bg-gray-700 p-2`} onClick={onClick}>
        {message}
      </div>
    </div>
  )
}

export default Toasts
