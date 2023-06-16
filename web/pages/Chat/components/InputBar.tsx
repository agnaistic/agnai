import { ImagePlus, Megaphone, MoreHorizontal, PlusCircle, Radio } from 'lucide-solid'
import { Component, createMemo, createSignal, For, onCleanup, Setter, Show } from 'solid-js'
import { AppSchema } from '../../../../srv/db/schema'
import Button from '../../../shared/Button'
import { DropMenu } from '../../../shared/DropMenu'
import { chatStore, toastStore, userStore } from '../../../store'
import { msgStore } from '../../../store'
import { SpeechRecognitionRecorder } from './SpeechRecognitionRecorder'
import { Toggle } from '/web/shared/Toggle'
import { defaultCulture } from '/web/shared/CultureCodes'
import { createDebounce } from '/web/shared/util'
import { useDraft } from '/web/shared/hooks'
// import WizardIcon from '/web/icons/WizardIcon'
// import NoCharacterIcon from '/web/icons/NoCharacterIcon'

const InputBar: Component<{
  chat: AppSchema.Chat
  bots: AppSchema.Character[]
  botMap: Record<string, AppSchema.Character>
  char?: AppSchema.Character
  swiped: boolean
  showOocToggle: boolean
  ooc: boolean
  setOoc: Setter<boolean>
  send: (msg: string, ooc: boolean, onSuccess?: () => void) => void
  more: (msg: string) => void
  request: (charId: string) => void
}> = (props) => {
  let ref: any

  const user = userStore()
  const state = msgStore((s) => ({ lastMsg: s.msgs.slice(-1)[0], msgs: s.msgs }))
  const chats = chatStore((s) => ({ replyAs: s.active?.replyAs }))

  const draft = useDraft(props.chat._id)

  const toggleOoc = () => {
    props.setOoc(!props.ooc)
  }

  const isOwner = createMemo(() => props.chat.userId === user.user?._id)

  const [text, setText] = createSignal(draft.text)
  const [menu, setMenu] = createSignal(false)
  const [cleared, setCleared] = createSignal(0, { equals: false })

  const placeholder = createMemo(() => {
    if (props.ooc) return 'Send a message... (OOC)'
    if (chats.replyAs) return `Send a message to ${props.botMap[chats.replyAs]?.name}...`
    return `Send a message...`
  })

  const [saveDraft, disposeSaveDraftDebounce] = createDebounce((text: string) => {
    draft.update(text)
  }, 500)

  const updateText = () => {
    if (!ref) return
    const value = ref.value || ''
    setText(ref.value || '')
    saveDraft(value)
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
      draft.clear()
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

  const onButtonClick = () => {
    setMenu(true)
  }

  const setAutoReplyAs = (charId: string) => {
    chatStore.setAutoReplyAs(charId)
    setMenu(false)
  }

  onCleanup(() => {
    disposeSaveDraftDebounce()
  })

  return (
    <div class="relative flex items-center justify-center">
      <Show when={props.showOocToggle}>
        <div class="cursor-pointer p-2" onClick={toggleOoc}>
          <Show when={props.ooc}>
            <Radio class="icon-button" />
          </Show>
          <Show when={!props.ooc}>
            <Radio color="var(--bg-100)" />
          </Show>
        </div>
      </Show>

      <textarea
        spellcheck
        lang={props.char?.culture}
        ref={ref}
        value={text()}
        placeholder={placeholder()}
        class="focusable-field h-10 min-h-[40px] w-full rounded-xl rounded-r-none px-4 py-2 hover:bg-[var(--bg-800)] active:bg-[var(--bg-800)]"
        onKeyDown={(ev) => {
          if (ev.key === 'Enter' && !ev.shiftKey) {
            send()
            ev.preventDefault()
          }
        }}
        onInput={updateText}
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
          <MoreHorizontal />
        </button>
        <DropMenu show={menu()} close={() => setMenu(false)} vert="up" horz="left">
          <div class="flex w-48 flex-col gap-2 p-2">
            {/* <Button schema="secondary" class="w-full" onClick={generateSelf} alignLeft>
              <MessageCircle size={18} />
              Respond as Me
            </Button> */}
            <Show when={props.bots.length > 1}>
              <div>Auto-reply</div>
              <Button
                schema="secondary"
                size="sm"
                onClick={() => setAutoReplyAs('')}
                disabled={!chats.replyAs}
              >
                None
              </Button>
              <For each={props.bots}>
                {(char) => (
                  <Show
                    when={props.chat.characters?.[char._id] || char._id === props.chat.characterId}
                  >
                    <Button
                      schema="secondary"
                      size="sm"
                      onClick={() => setAutoReplyAs(char._id)}
                      disabled={chats.replyAs === char._id}
                    >
                      {char.name}
                    </Button>
                  </Show>
                )}
              </For>
              <hr />
            </Show>
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
              <ImagePlus size={18} /> Generate Image
            </Button>
            <Show when={!!state.lastMsg?.characterId && isOwner()}>
              <Button schema="secondary" class="w-full" onClick={more} alignLeft>
                <PlusCircle size={18} /> Generate More
              </Button>
              <Show when={!!props.char?.voice}>
                <Button schema="secondary" class="w-full" onClick={playVoice} alignLeft>
                  <Megaphone size={18} /> Play Voice
                </Button>
              </Show>
            </Show>
          </div>
        </DropMenu>
      </div>
    </div>
  )
}

export default InputBar
