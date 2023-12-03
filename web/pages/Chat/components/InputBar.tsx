import { ImagePlus, Megaphone, MoreHorizontal, PlusCircle, Send, Zap } from 'lucide-solid'
import {
  Component,
  createMemo,
  createSignal,
  For,
  Match,
  onCleanup,
  Setter,
  Show,
  Switch,
} from 'solid-js'
import { AppSchema } from '../../../../common/types/schema'
import Button, { LabelButton } from '../../../shared/Button'
import { DropMenu } from '../../../shared/DropMenu'
import TextInput from '../../../shared/TextInput'
import { chatStore, toastStore, userStore, settingStore, characterStore } from '../../../store'
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
import { AutoComplete } from '/web/shared/AutoComplete'
import FileInput, { FileInputResult, getFileAsDataURL } from '/web/shared/FileInput'
import { embedApi } from '/web/store/embeddings'
import AvatarIcon from '/web/shared/AvatarIcon'

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
  let ref: HTMLTextAreaElement

  const [ctx] = useAppContext()

  const user = userStore()
  const state = msgStore((s) => ({
    lastMsg: s.msgs.slice(-1)[0],
    msgs: s.msgs,
    canCaption: s.canImageCaption,
  }))
  const chats = chatStore((s) => ({ replyAs: s.active?.replyAs }))
  const chars = characterStore()

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
  const [complete, setComplete] = createSignal(false)
  const [listening, setListening] = createSignal(false)

  const completeOpts = createMemo(() => {
    const list = ctx.activeBots.map((char) => ({ label: char.name, value: char._id }))
    return list
  })

  const onCompleteSelect = (opt: { label: string }) => {
    setComplete(false)
    let prev = text()
    const before = prev.slice(0, ref.selectionStart - 1)
    const after = prev.slice(ref.selectionStart)
    const next = `${before}${opt.label}${after}`
    setText(next)
    saveDraft(next)
    ref.focus()
    ref.setSelectionRange(
      before.length + opt.label.length,
      before.length + opt.label.length,
      'none'
    )
  }

  const placeholder = createMemo(() => {
    if (props.ooc) return 'Send a message... (OOC)'
    if (chats.replyAs) return `Send a message to ${ctx.allBots[chats.replyAs]?.name}...`
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

  const [send] = createDebounce(() => {
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
  }, 100)

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
    const lastTextMsg = state.msgs.reduceRight<AppSchema.ChatMessage | void>((prev, curr) => {
      if (prev) return prev
      if (curr.adapter === 'image' || !curr.characterId) return
      return curr
    }, undefined)

    if (!lastTextMsg) {
      toastStore.warn(`Could not play voice: No character message found`)
      return
    }

    if (!lastTextMsg.characterId) return
    const char = ctx.allBots[lastTextMsg.characterId]
    if (!char?.voice) return

    msgStore.textToSpeech(
      lastTextMsg._id,
      lastTextMsg.msg,
      char.voice,
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

  const onFile = async (files: FileInputResult[]) => {
    const [file] = files
    if (!file) return

    const buffer = await getFileAsDataURL(file.file)
    const caption = await embedApi.captionImage(buffer.content)
    setText(`*{{user}} shows {{char}} a picture that contains: ${caption}*`)
    send()
  }

  return (
    <div class="relative flex items-center justify-center">
      <Show when={props.showOocToggle}>
        <div class="cursor-pointer p-2" onClick={toggleOoc}>
          <Show when={!props.ooc}>
            <WizardIcon />
          </Show>
          <Show when={props.ooc}>
            <NoCharacterIcon color="var(--bg-500)" />
          </Show>
        </div>
      </Show>

      <div class="flex items-center">
        <a
          href="#"
          role="button"
          aria-label="Open impersonation menu"
          class="icon-button"
          onClick={() => settingStore.toggleImpersonate(true)}
        >
          <AvatarIcon
            avatarUrl={chars.impersonating?.avatar || user.profile?.avatar}
            format={{ corners: 'circle', size: 'sm' }}
            class="mr-2"
          />
        </a>
      </div>
      <Show when={complete()}>
        <AutoComplete
          options={completeOpts()}
          close={() => setComplete(false)}
          onSelect={onCompleteSelect}
          dir="up"
          offset={44}
        />
      </Show>
      <TextInput
        fieldName="chatInput"
        isMultiline
        spellcheck
        lang={props.char?.culture}
        ref={ref! as any}
        value={text()}
        placeholder={placeholder()}
        parentClass="flex w-full"
        class="input-bar rounded-r-none hover:bg-[var(--bg-800)] active:bg-[var(--bg-800)]"
        onKeyDown={(ev) => {
          if (ev.key === '@') {
            setComplete(true)
          }

          const isMobileDevice = /Mobi/i.test(window.navigator.userAgent)
          const canMobileSend = isMobileDevice ? user.ui.mobileSendOnEnter : true
          if (ev.key === 'Enter' && !ev.shiftKey && canMobileSend) {
            if (complete()) return
            send()
            ev.preventDefault()
          }
        }}
        onInput={updateText}
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
            <Show when={!!props.char?.voice?.service}>
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
          <Show when={state.canCaption}>
            <FileInput
              fieldName="imageCaption"
              parentClass="hidden"
              onUpdate={onFile}
              accept="image/jpg,image/png,image/jpeg"
            />
            <LabelButton for="imageCaption" schema="secondary" class="w-full" alignLeft>
              Send Image
            </LabelButton>
          </Show>
        </div>
      </DropMenu>
      <Switch>
        <Match when={text() === '' || listening()}>
          <SpeechRecognitionRecorder
            culture={props.char?.culture}
            onText={(value) => setText(value)}
            onSubmit={() => send()}
            cleared={cleared}
            listening={setListening}
          />
        </Match>

        <Match when>
          <Button schema="clear">
            <Send class="icon-button" size={18} onClick={send} />
          </Button>
        </Match>
      </Switch>
    </div>
  )
}

export default InputBar
