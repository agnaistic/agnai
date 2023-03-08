import { ImagePlus, Send } from 'lucide-solid'
import { Component, JSX } from 'solid-js'
import { AppSchema } from '../../../../srv/db/schema'
import { msgStore } from '../../../store/message'
import './Message.css'

const InputBar: Component<{ chat: AppSchema.Chat }> = (props) => {
  let ref: HTMLInputElement | undefined
  const send = () => {
    if (!ref) return
    if (!ref.value) return

    msgStore.send(props.chat._id, ref.value)
    ref.value = ''
  }

  const createImage = () => {
    msgStore.createImage(props.chat._id)
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
      <IconButton onClick={createImage}>
        <ImagePlus />
      </IconButton>
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
