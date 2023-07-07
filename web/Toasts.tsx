import { Component, For, Show } from 'solid-js'
import { Toast, toastStore } from './store/toasts'
import Modal from './shared/Modal'
import { TitleCard } from './shared/Card'
import Button from './shared/Button'

const bgColor = {
  default: 'bg-500',
  error: 'bg-red-600',
  success: 'bg-green-600',
  warn: 'bg-orange-600',
} satisfies { [key in Toast['type']]: string }

const Toasts: Component = () => {
  const state = toastStore()

  return (
    <>
      <div class="absolute bottom-2 right-2 flex max-w-[20rem] flex-col gap-2">
        <For each={state.toasts}>{(toast) => <Single toast={toast} />}</For>
      </div>

      <Modal title="Notifications" show={state.modal} close={() => toastStore.modal(false)}>
        <div class="flex flex-col gap-2 text-sm">
          <Show when={state.history.length === 0}>You have no notifications.</Show>
          <Show when={state.history.length > 0}>
            <div class="flex justify-center">
              <Button
                onClick={() => {
                  toastStore.clearHistory()
                  toastStore.modal(false)
                }}
              >
                Clear Notifications
              </Button>
            </div>
            <For each={state.history}>
              {({ time, toast, seen }) => (
                <TitleCard
                  type={toast.type === 'error' ? 'rose' : toast.type === 'warn' ? 'orange' : 'bg'}
                >
                  <p>
                    <em>{time.toLocaleString()}</em>
                  </p>
                  <p>{toast.message}</p>
                </TitleCard>
              )}
            </For>
          </Show>
        </div>
      </Modal>
    </>
  )
}

const Single: Component<{ toast: Toast }> = (props) => {
  const bg = bgColor[props.toast.type]
  const onClick = () => toastStore.remove(props.toast.id)
  return (
    <div class="flex flex-row justify-end">
      <div class={`${bg} w-2 rounded-l-lg p-2`}></div>
      <div class={`bg-700 cursor-pointer rounded-r-lg p-2`} onClick={onClick}>
        {props.toast.message}
      </div>
    </div>
  )
}

export default Toasts
