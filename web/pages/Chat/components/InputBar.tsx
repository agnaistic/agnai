import { ImagePlus, Megaphone, MoreHorizontal, PlusCircle, Zap } from 'lucide-solid'
import { Component, createMemo, createSignal, For, onCleanup, Setter, Show } from 'solid-js'
import { AppSchema } from '../../../../common/types/schema'
import Button from '../../../shared/Button'
import { DropMenu } from '../../../shared/DropMenu'
import TextInput from '../../../shared/TextInput'
import { chatStore, toastStore, userStore } from '../../../store'
import { msgStore } from '../../../store'
import { SpeechRecognitionRecorder } from './SpeechRecognitionRecorder'
import { Toggle } from '/web/shared/Toggle'
import { defaultCulture } from '/web/shared/CultureCodes'
import { createDebounce } from '/web/shared/util'
import { useDraft, useEffect } from '/web/shared/hooks'
import { eventStore } from '/web/store/event'
import { useAppContext } from '/web/store/context'
import NoCharacterIcon from '/web/icons/NoCharacterIcon'
import WizardIcon from '/web/icons/WizardIcon'
import { EVENTS, events } from '/web/emitter'

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

  const [ctx] = useAppContext()

  const user = userStore()
  const state = msgStore((s) => ({ lastMsg: s.msgs.slice(-1)[0], msgs: s.msgs }))
  const chats = chatStore((s) => ({ replyAs: s.active?.replyAs }))

  useEffect(() => {
    const listener = (text: string) => {
      setText('')
      setText(text)
    }

    events.on(EVENTS.setInputText, listener)

    return () => events.removeListener(EVENTS.setInputText, listener)
  })

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
  }, 50)

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

  const respondAgain = () => {
    msgStore.request(props.chat._id, props.chat.characterId)
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

  const triggerEvent = () => {
    eventStore.triggerEvent(props.chat, props.botMap[chats.replyAs!])
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

  const genActions = () => {
    msgStore.generateActions()
    toastStore.normal('Generating...')
    setMenu(false)
  }

  return (
    <div class="relative flex items-center justify-center">
      <Show when={props.showOocToggle}>
        <div class="cursor-pointer p-2" onClick={toggleOoc}>
          <Show when={props.ooc}>
            <WizardIcon />
          </Show>
          <Show when={!props.ooc}>
            <NoCharacterIcon color="var(--bg-500)" />
          </Show>
        </div>
      </Show>

      <TextInput
        fieldName="chatInput"
        isMultiline
        spellcheck
        lang={props.char?.culture}
        ref={ref}
        value={text()}
        placeholder={placeholder()}
        parentClass="flex w-full"
        class="input-bar rounded-r-none hover:bg-[var(--bg-800)] active:bg-[var(--bg-800)]"
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
      <button
        onClick={onButtonClick}
        class="h-full rounded-l-none rounded-r-md border-l border-[var(--bg-700)] bg-[var(--bg-800)] px-2 py-2 hover:bg-[var(--bg-700)]"
      >
        <MoreHorizontal />
      </button>
      <DropMenu show={menu()} close={() => setMenu(false)} vert="up" horz="left">
        <div class="flex w-48 flex-col gap-2 p-2">
          {/* <Button schema="secondary" class="w-full" onClick={generateSelf} alignLeft>
              <MessageCircle size={18} />
              Respond as Me
            </Button> */}
          <Show when={ctx.activeBots.length > 1}>
            <div>Auto-reply</div>
            <Button
              schema="secondary"
              size="sm"
              onClick={() => setAutoReplyAs('')}
              disabled={!chats.replyAs}
            >
              None
            </Button>
            <For each={ctx.activeBots}>
              {(char) => (
                <Button
                  schema="secondary"
                  size="sm"
                  onClick={() => setAutoReplyAs(char._id)}
                  disabled={chats.replyAs === char._id}
                >
                  {char.name}
                </Button>
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
          <Show when={ctx.flags.actions}>
            <Button schema="secondary" class="w-full" onClick={genActions} alignLeft>
              Generate Actions
            </Button>
          </Show>
          <Button schema="secondary" class="w-full" onClick={createImage} alignLeft>
            <ImagePlus size={18} /> Generate Image
          </Button>
          <Show when={!!state.lastMsg?.characterId && isOwner()}>
            <Button schema="secondary" class="w-full" onClick={respondAgain} alignLeft>
              <PlusCircle size={18} /> Respond Again
            </Button>
            <Button schema="secondary" class="w-full" onClick={more} alignLeft>
              <PlusCircle size={18} /> Generate More
            </Button>
            <Show when={!!props.char?.voice}>
              <Button schema="secondary" class="w-full" onClick={playVoice} alignLeft>
                <Megaphone size={18} /> Play Voice
              </Button>
            </Show>
            <Show
              when={
                !!ctx.chat?.scenarioIds?.length &&
                isOwner() &&
                (chats.replyAs || ctx.activeBots.length === 1)
              }
            >
              <Button schema="secondary" class="w-full" onClick={triggerEvent} alignLeft>
                <Zap /> Trigger Event
              </Button>
            </Show>
          </Show>
        </div>
      </DropMenu>
    </div>
  )
}

export default InputBar
