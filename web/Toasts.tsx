import { Component, For } from 'solid-js'
import { Toast, toastStore } from './store/toasts'

const bgColor = {
  default: 'bg-[var(--bg-500)]',
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

const Single: Component<{ toast: Toast }> = (props) => {
  const bg = bgColor[props.toast.type]
  const onClick = () => toastStore.remove(props.toast.id)
  return (
    <div class="flex flex-row justify-end">
      <div class={`${bg} w-2 rounded-l-lg p-2`}></div>
      <div class={`cursor-pointer rounded-r-lg bg-[var(--bg-700)] p-2`} onClick={onClick}>
        {props.toast.message}
      </div>
    </div>
  )
}

export default Toasts
