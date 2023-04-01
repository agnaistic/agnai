import { ChevronUp, ImagePlus, PlusCircle, Send } from 'lucide-solid'
import { Component, createSignal, JSX, Show } from 'solid-js'
import { AppSchema } from '../../../../srv/db/schema'
import Button from '../../../shared/Button'
import { DropMenu, Dropup } from '../../../shared/DropMenu'
import { chatStore, toastStore, userStore } from '../../../store'
import { msgStore } from '../../../store'
import './Message.css'

const InputBar: Component<{
  chat: AppSchema.Chat
  swiped: boolean
  send: (msg: string, onSuccess?: () => void) => void
  more: (msg: string) => void
}> = (props) => {
  let ref: any
  const user = userStore()
  const state = msgStore((s) => ({ lastMsg: s.msgs.slice(-1)[0] }))

  const [text, setText] = createSignal('')
  const [menu, setMenu] = createSignal(false)

  const updateText = (ev: Event) => {
    if (!ref) return
    setText(ref.value)
  }

  const send = () => {
    if (!ref) return

    const value = ref.value.trim() || text().trim()
    if (!value) return

    if (props.swiped) {
      return toastStore.warn(`Confirm or cancel swiping before sending`)
    }

    props.send(value, () => {
      ref.value = ''
      setText('')
    })
  }

  return (
    <div class="flex items-center justify-center max-sm:pb-2">
      <Show when={user.ui.input === 'single'}>
        <input
          spellcheck
          ref={ref}
          type="text"
          placeholder="Send a message..."
          class="focusable-field w-full rounded-xl rounded-r-none px-4 py-2"
          onKeyDown={updateText}
          onKeyUp={(ev) => ev.key === 'Enter' && send()}
        />
      </Show>
      <Show when={!user.ui.input || user.ui.input === 'multi'}>
        <textarea
          spellcheck
          ref={ref}
          placeholder="Send a message..."
          class="focusable-field h-10 min-h-[40px] w-full rounded-xl rounded-r-none px-4 py-2"
          onKeyPress={(ev) => {
            if (ev.key === 'Enter') {
              if (ev.ctrlKey || ev.shiftKey) return
              return send()
            }

            updateText(ev)
          }}
        />
      </Show>
      <div>
        <button
          onClick={() => setMenu(true)}
          class="rounded-l-none rounded-r-md border-l border-[var(--bg-700)] bg-[var(--bg-800)] py-2 px-2 hover:bg-[var(--bg-700)]"
        >
          <ChevronUp />
        </button>
        <DropMenu show={menu()} close={() => setMenu(false)} vert="up" horz="left">
          <div class="w-48 p-2">
            <Show when={!!state.lastMsg?.characterId && props.chat.userId === user.user?._id}>
              <Button
                schema="secondary"
                class="w-full"
                onClick={() => props.more(state.lastMsg.msg)}
              >
                <PlusCircle size={18} /> Generate More
              </Button>
            </Show>
          </div>
        </DropMenu>
      </div>
      {/* <Show when={!!state.lastMsg?.characterId && props.chat.userId === user.user?._id}>
        <IconButton onClick={() => props.more(state.lastMsg.msg)}>
          <PlusCircle />
        </IconButton>
      </Show> */}
    </div>
  )
}

export default InputBar
