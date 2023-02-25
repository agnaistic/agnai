import { Sliders, Send } from 'lucide-solid'
import { Component, JSX } from 'solid-js'
import { msgStore } from '../../../store/message'
import './Message.css'

const InputBar: Component<{ chatId: string; openConfig: () => void }> = (props) => {
  let ref: HTMLInputElement | undefined
  const send = () => {
    if (!ref) return
    if (!ref.value) return
    msgStore.send(props.chatId, ref.value)
    ref.value = ''
  }
  return (
    <div class="mb-2 flex justify-center pb-4 max-sm:pb-0">
      <input
        ref={ref}
        type="text"
        placeholder="Send a message..."
        class="focusable-field w-full rounded-l-xl px-4 py-2"
        onKeyUp={(ev) => ev.key === 'Enter' && send()}
      />
      <IconButton onClick={props.openConfig}>
        <Sliders size={20} />
      </IconButton>
      <IconButton onClick={send}>
        <Send size={20} />
      </IconButton>
      <div class="rounded-r-xl bg-white/5 pr-2" />
    </div>
  )
}

const IconButton: Component<{ children: JSX.Element; onClick?: (ev: MouseEvent) => void }> = (
  props
) => (
  <button
    type="button"
    class="focusable-icon-button focusable-field border-2 border-transparent py-3 px-1"
    onClick={(ev) => props.onClick?.(ev)}
  >
    {props.children}
  </button>
)

export default InputBar
