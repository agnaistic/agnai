import { ImagePlus, PlusCircle, Send } from 'lucide-solid'
import { Component, JSX, Show } from 'solid-js'
import { AppSchema } from '../../../../srv/db/schema'
import { chatStore, toastStore } from '../../../store'
import { msgStore } from '../../../store/message'
import './Message.css'

const InputBar: Component<{
  chat: AppSchema.Chat
  swiped: boolean
  send: (msg: string) => void
  more: (msg: string) => void
}> = (props) => {
  let ref: HTMLInputElement | undefined
  const state = msgStore((s) => ({ lastMsg: s.msgs.slice(-1)[0] }))

  const send = () => {
    if (!ref) return
    if (!ref.value) return

    if (props.swiped) {
      return toastStore.warn(`Confirm or cancel swiping before sending`)
    }

    props.send(ref.value)
    ref.value = ''
  }

  const createImage = () => {
    msgStore.createImage(props.chat._id)
  }

  return (
    <div class="flex items-center justify-center gap-2 max-sm:pb-0">
      <input
        ref={ref}
        type="text"
        placeholder="Send a message..."
        class="focusable-field w-full rounded-xl px-4 py-2"
        onKeyUp={(ev) => ev.key === 'Enter' && send()}
      />
      {/* <IconButton onClick={createImage}>
        <ImagePlus />
      </IconButton> */}
      <Show when={!!state.lastMsg?.characterId}>
        <IconButton onClick={() => props.more(state.lastMsg.msg)}>
          <PlusCircle />
        </IconButton>
      </Show>
      <IconButton onClick={send}>
        <Send size={20} />
      </IconButton>
    </div>
  )
}

const IconButton: Component<{
  children: JSX.Element
  onClick?: (ev: MouseEvent) => void
  class?: string
}> = (props) => (
  <button
    type="button"
    class={`focusable-icon-button focusable-field rounded-xl border-2 border-transparent bg-transparent py-3 px-1 ${
      props.class || ''
    }`}
    onClick={(ev) => props.onClick?.(ev)}
  >
    {props.children}
  </button>
)

export default InputBar
