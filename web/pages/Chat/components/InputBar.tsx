import { Sliders, Send } from 'lucide-solid'
import { Component, JSX, Show } from 'solid-js'
import { AppSchema } from '../../../../srv/db/schema'
import { userStore } from '../../../store'
import { msgStore } from '../../../store/message'
import './Message.css'

const InputBar: Component<{ chat: AppSchema.Chat; openConfig: () => void }> = (props) => {
  const state = userStore()

  let ref: HTMLInputElement | undefined
  const send = () => {
    if (!ref) return
    if (!ref.value) return
    msgStore.send(props.chat._id, ref.value)
    ref.value = ''
  }
  return (
    <div class="flex justify-center gap-2 max-sm:pb-0">
      <input
        ref={ref}
        type="text"
        placeholder="Send a message..."
        class="focusable-field w-full rounded-xl px-4 py-2"
        onKeyUp={(ev) => ev.key === 'Enter' && send()}
      />
      <Show when={props.chat.userId === state.user?._id}>
        <IconButton onClick={props.openConfig}>
          <Sliders size={20} />
        </IconButton>
      </Show>
      <IconButton onClick={send}>
        <Send size={20} />
      </IconButton>
    </div>
  )
}

const IconButton: Component<{ children: JSX.Element; onClick?: (ev: MouseEvent) => void }> = (
  props
) => (
  <button
    type="button"
    class="focusable-icon-button focusable-field rounded-xl border-2 border-transparent bg-transparent py-3 px-1"
    onClick={(ev) => props.onClick?.(ev)}
  >
    {props.children}
  </button>
)

export default InputBar
