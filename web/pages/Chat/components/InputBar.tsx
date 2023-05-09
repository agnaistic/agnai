import { ImagePlus, Megaphone, MoreHorizontal, PlusCircle, Send } from 'lucide-solid'
import { Component, createMemo, createSignal, onMount, Setter, Show } from 'solid-js'
import { AppSchema } from '../../../../srv/db/schema'
import Button from '../../../shared/Button'
import { DropMenu } from '../../../shared/DropMenu'
import { toastStore, userStore } from '../../../store'
import { msgStore } from '../../../store'
import './Message.css'
import { SpeechRecognitionRecorder } from './SpeechRecognitionRecorder'
import { Toggle } from '/web/shared/Toggle'
import { defaultCulture } from '/web/shared/CultureCodes'

const InputBar: Component<{
  chat: AppSchema.Chat
  char?: AppSchema.Character
  swiped: boolean
  showOocToggle: boolean
  ooc: boolean
  setOoc: Setter<boolean>
  send: (msg: string, ooc: boolean, onSuccess?: () => void) => void
  more: (msg: string) => void
}> = (props) => {
  let ref: any

  const user = userStore()
  const state = msgStore((s) => ({ lastMsg: s.msgs.slice(-1)[0], msgs: s.msgs }))
  const toggleOoc = () => {
    props.setOoc(!props.ooc)
  }

  const isOwner = createMemo(() => props.chat.userId === user.user?._id)

  const [text, setText] = createSignal('')
  const [menu, setMenu] = createSignal(false)
  const [cleared, setCleared] = createSignal(0, { equals: false })

  const updateText = (ev: Event) => {
    if (!ref) return
    setText(ref.value || '')
  }

  const send = () => {
    if (!ref) return

    const value = ref.value.trim() || text().trim()
    if (!value) return

    if (props.swiped) {
      return toastStore.warn(`Confirm or cancel swiping before sending`)
    }

    props.send(value, props.ooc, () => {
      ref.value = ''
      setText('')
      setCleared(0)
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

  const playVoice = () => {
    const voice = props.char?.voice
    if (!voice) return
    const lastTextMsg = state.msgs.reduceRight<AppSchema.ChatMessage | void>((prev, curr) => {
      if (prev) return prev
      if (curr.adapter === 'image' || curr.userId) return
      return curr
    }, undefined)

    if (!lastTextMsg) {
      toastStore.warn(`Could not play voice: No character message found`)
      return
    }

    msgStore.textToSpeech(
      lastTextMsg._id,
      lastTextMsg.msg,
      voice,
      props.char?.culture || defaultCulture
    )
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

  const onButtonClick = () => {
    if (text().length > 0) {
      send()
      return
    }

    setMenu(true)
  }

  return (
    <div class="relative flex items-center justify-center">
      <textarea
        spellcheck
        lang={props.char?.culture}
        ref={ref}
        value={text()}
        placeholder={props.ooc ? 'Send a message... (Out of character)' : 'Send a message...'}
        class="focusable-field h-10 min-h-[40px] w-full rounded-xl rounded-r-none px-4 py-2"
        onKeyDown={(ev) => {
          if (ev.key === 'Enter') {
            if (ev.ctrlKey || ev.shiftKey) return
            return send()
          }

          updateText(ev)
        }}
      />

      <SpeechRecognitionRecorder
        culture={props.char?.culture}
        class="right-11"
        onText={(value) => setText(value)}
        onSubmit={() => send()}
        cleared={cleared}
      />
      <div>
        <button
          onClick={onButtonClick}
          class="rounded-l-none rounded-r-md border-l border-[var(--bg-700)] bg-[var(--bg-800)] py-2 px-2 hover:bg-[var(--bg-700)]"
        >
          <Show when={text().trim().length === 0}>
            <MoreHorizontal />
          </Show>
          <Show when={text().trim().length > 0}>
            <Send />
          </Show>
        </button>
        <DropMenu show={menu()} close={() => setMenu(false)} vert="up" horz="left">
          <div class="flex w-48 flex-col gap-2 p-2">
            {/* <Button schema="secondary" class="w-full" onClick={generateSelf} alignLeft>
              <MessageCircle size={18} />
              Respond as Me
            </Button> */}
            <Show when={props.showOocToggle}>
              <Button
                schema="secondary"
                size="sm"
                class="flex items-center justify-between"
                onClick={toggleOoc}
              >
                <div>Stop Bot Reply</div>
                <Toggle fieldName="ooc" value={props.ooc} onChange={toggleOoc} />
              </Button>
            </Show>
            <Button schema="secondary" class="w-full" onClick={createImage} alignLeft>
              <ImagePlus size={18} /> Generage Image
            </Button>
            <Show when={!!state.lastMsg?.characterId && isOwner()}>
              <Button schema="secondary" class="w-full" onClick={more} alignLeft>
                <PlusCircle size={18} /> Generate More
              </Button>
              <Button schema="secondary" class="w-full" onClick={playVoice} alignLeft>
                <Megaphone size={18} /> Play Voice
              </Button>
            </Show>
          </div>
        </DropMenu>
      </div>
    </div>
  )
}

export default InputBar
