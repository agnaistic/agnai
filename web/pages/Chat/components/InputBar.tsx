import { Sliders, Send } from 'lucide-solid'
import { Component, JSX } from 'solid-js'
import { chatStore } from '../../../store'
import './Message.css'

/** Meant to be used exclusively within the InputBar. */
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

/** Bar containing the message text input and some attached buttons. */
const InputBar: Component = () => {
  const state = chatStore((state) => ({ partial: state.partial }))
  let ref: HTMLInputElement | undefined
  const send = () => {
    if (!ref) return
    if (!ref.value) return
    chatStore.send(ref.value)
    ref.value = ''
  }
  return (
    <div class="flex justify-center pb-4 max-sm:pb-0">
      <input
        ref={ref}
        type="text"
        placeholder="Send a message..."
        class="focusable-field w-full rounded-l-xl px-4 py-2"
        disabled={!!state.partial}
      />
      <IconButton>
        <Sliders size={20} />
      </IconButton>
      <IconButton onClick={send}>
        <Send size={20} />
      </IconButton>
      <div class="rounded-r-xl bg-white/5 pr-2" />
    </div>
  )
}

export default InputBar
