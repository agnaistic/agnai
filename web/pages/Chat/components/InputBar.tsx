import { ChevronUp, ImagePlus, PlusCircle } from 'lucide-solid'
import { Component, createMemo, createSignal, Show } from 'solid-js'
import { AppSchema } from '../../../../srv/db/schema'
import Button from '../../../shared/Button'
import { DropMenu } from '../../../shared/DropMenu'
import { toastStore, userStore } from '../../../store'
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

  const isOwner = createMemo(() => props.chat.userId === user.user?._id)

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

  const createImage = () => {
    msgStore.createImage()
    setMenu(false)
  }

  const more = () => {
    props.more(state.lastMsg.msg)
    setMenu(false)
  }

  const regenerate = () => {
    msgStore.retry(props.chat._id)
    setMenu(false)
  }

  const generateSelf = () => {
    msgStore.selfGenerate()
    setMenu(false)
  }

  return (
    <div class="flex items-center justify-center max-sm:pb-2">
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

      <div>
        <button
          onClick={() => setMenu(true)}
          class="rounded-l-none rounded-r-md border-l border-[var(--bg-700)] bg-[var(--bg-800)] py-2 px-2 hover:bg-[var(--bg-700)]"
        >
          <ChevronUp />
        </button>
        <DropMenu show={menu()} close={() => setMenu(false)} vert="up" horz="left">
          <div class="flex w-48 flex-col gap-2 p-2">
            {/* <Button schema="secondary" class="w-full" onClick={generateSelf} alignLeft>
              <MessageCircle size={18} />
              Respond as Me
            </Button> */}
            <Button schema="secondary" class="w-full" alignLeft onClick={regenerate}>
              Regenerate
            </Button>
            <Button schema="secondary" class="w-full" onClick={createImage} alignLeft>
              <ImagePlus size={18} /> Generage Image
            </Button>
            <Show when={!!state.lastMsg?.characterId && isOwner()}>
              <Button schema="secondary" class="w-full" onClick={more} alignLeft>
                <PlusCircle size={18} /> Generate More
              </Button>
            </Show>
          </div>
        </DropMenu>
      </div>
    </div>
  )
}

export default InputBar
