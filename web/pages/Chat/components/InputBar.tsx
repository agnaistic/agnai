import {
  ImagePlus,
  ImageUp,
  Megaphone,
  MessageCircle,
  MoreHorizontal,
  PlusCircle,
  ScanFaceIcon,
  Send,
  StopCircle,
  X,
  Zap,
} from 'lucide-solid'
import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  Match,
  on,
  onCleanup,
  Setter,
  Show,
  Switch,
} from 'solid-js'
import { AppSchema } from '../../../../common/types/schema'
import Button, { LabelButton } from '../../../shared/Button'
import { DropMenu } from '../../../shared/DropMenu'
import TextInput from '../../../shared/TextInput'
import {
  chatStore,
  toastStore,
  userStore,
  characterStore,
  ChatMessageExt,
  promptStore,
  pageStore,
  responseStore,
} from '../../../store'
import { msgStore } from '../../../store'
import { SpeechRecognitionRecorder } from './SpeechRecognitionRecorder'
import { Toggle } from '/web/shared/Toggle'
import { defaultCulture } from '/web/shared/CultureCodes'
import { createDebounce } from '/web/shared/util'
import { useDraft, useEffect, useMobileDetect } from '/web/shared/hooks'
import { eventStore } from '/web/store/event'
import { useAppContext } from '/web/store/context'
import NoCharacterIcon from '/web/icons/NoCharacterIcon'
import WizardIcon from '/web/icons/WizardIcon'
import { EVENTS, events } from '/web/emitter'
import { AutoComplete } from '/web/shared/AutoComplete'
import FileInput, { FileInputResult } from '/web/shared/FileInput'
import AvatarIcon from '/web/shared/AvatarIcon'
import { resizeImage } from '/web/shared/image-resize'
import { ALLOWED_TYPES, imageApi } from '/web/store/data/image'
import { MsgAttachment } from '/srv/adapter/type'
import { extractReasoning } from '/common/reasoning'
import { usePresetContext } from '/web/store/preset-context'
import { debug } from '/common/debug'
import { Pill } from '/web/shared/Card'
import { EmojiEntry, EmojiPicker, searchEmojis } from './EmojiPicker'

export type SendFunc = (opts: {
  msg: string
  ooc: boolean
  onSuccess?: () => void
  onError?: (err?: string) => void
}) => void

/** Maximum number of emoji matches shown in the ":" quick search */
const MAX_QUICK_EMOJIS = 6

const InputBar: Component<{
  chat: AppSchema.Chat
  bots: AppSchema.Character[]
  botMap: Record<string, AppSchema.Character>
  char?: AppSchema.Character
  swiped: boolean
  showOocToggle: boolean
  ooc: boolean
  setOoc: Setter<boolean | undefined>
  send: SendFunc
  more: (msg: string) => void
  request: (charId: string) => void
}> = (props) => {
  let ref: HTMLTextAreaElement | undefined

  const [ctx] = useAppContext()
  const [preset] = usePresetContext()

  const prompt = promptStore((s) => ({ hintsEnabled: s.hintsEnabled, hint: s.hint }))
  const user = userStore((s) => ({ user: s.user, profile: s.profile, ui: s.ui }))
  const state = msgStore((s) => ({
    lastMsg: s.msgs.reduceRight<ChatMessageExt>((prev, curr, i) => {
      if (prev) return prev
      if (curr.characterId && !curr.userId) return curr
      if (i === 0) return curr
      return undefined as any
    }, undefined as any),
    msgs: s.msgs,
    canCaption: s.canImageCaption,
  }))
  const chars = characterStore((s) => ({ impersonating: s.impersonating }))

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
  const [dragging, setDragging] = createSignal(false)
  const mob = useMobileDetect()

  // ":" quick emoji search (WhatsApp/Discord style)
  // The ":query" text is typed directly in the message input; the panel tracks the
  // ":token" next to the caret. null = inactive. The caret can move inside the token
  // without reindexing, so arrow navigation stays stable.
  const [emojiToken, setEmojiToken] = createSignal<{ start: number; query: string } | null>(null)
  const [emojiIndex, setEmojiIndex] = createSignal(0)
  // Start offset of a token the user explicitly dismissed with Escape
  const [emojiDismissedAt, setEmojiDismissedAt] = createSignal(-1)

  const emojiMatches = createMemo(() => {
    const token = emojiToken()
    if (!token) return [] as EmojiEntry[]
    return searchEmojis(token.query, MAX_QUICK_EMOJIS)
  })

  // Re-evaluate the ":token" before the caret (runs on every input and caret change)
  const parseEmojiToken = () => {
    if (!ref) return
    const caret = ref.selectionStart ?? ref.value.length
    const match = /(^|[^\w:]):(\w*)$/.exec(ref.value.slice(0, caret))
    if (!match) {
      // No ":token" at the caret: close the panel and clear any dismissal
      setEmojiToken(null)
      setEmojiDismissedAt(-1)
      return
    }
    const start = caret - match[2].length - 1
    if (start === emojiDismissedAt()) {
      // This token was dismissed with Escape: leave it as plain text
      setEmojiToken(null)
      return
    }
    setEmojiToken({ start, query: match[2] })
  }

  const pickEmoji = (emoji?: string) => {
    const token = emojiToken()
    setEmojiToken(null)
    setEmojiDismissedAt(-1)
    if (!emoji || !token || !ref) return

    // Replace the ":query" token with the selected emoji
    const caret = ref.selectionStart ?? ref.value.length
    const next = `${ref.value.slice(0, token.start)}${emoji}${ref.value.slice(caret)}`
    const caretNext = token.start + emoji.length
    setText(next)
    saveDraft(next)

    queueMicrotask(() => {
      if (!ref) return
      ref.focus()
      ref.setSelectionRange(caretNext, caretNext, 'none')
    })
  }

  const completeOpts = createMemo(() => {
    const list = ctx.activeBots.map((char) => ({ label: char.name, value: char._id }))
    return list
  })

  const onCompleteSelect = (opt: { label: string }) => {
    setComplete(false)
    let prev = text()
    const before = prev.slice(0, ref!.selectionStart - 1)
    const after = prev.slice(ref!.selectionStart)
    const next = `${before}${opt.label}${after}`
    setText(next)
    saveDraft(next)
    ref!.focus()
    ref!.setSelectionRange(
      before.length + opt.label.length,
      before.length + opt.label.length,
      'none'
    )
  }

  const insertEmoji = (emoji: string) => {
    const prev = ref?.value ?? text()
    const start = ref?.selectionStart ?? prev.length
    const end = ref?.selectionEnd ?? prev.length
    const next = `${prev.slice(0, start)}${emoji}${prev.slice(end)}`
    const caret = start + emoji.length

    setText(next)
    saveDraft(next)

    // TextInput writes the signal value back into the textarea, which drops the caret at the end.
    // Restore it after that sync so consecutive picks land where the user expects.
    queueMicrotask(() => {
      if (!ref) return
      ref.focus()
      ref.setSelectionRange(caret, caret, 'none')
    })
  }

  const placeholder = createMemo(() => {
    if (props.ooc) return 'Send a message... (OOC)'
    if (ctx.replyAs) return `Send a message to ${ctx.allBots[ctx.replyAs]?.name}...`
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
    parseEmojiToken()
  }

  const [send] = createDebounce(() => {
    if (!ref) return

    const value = ref.value.trim() || text().trim()
    if (!value) return

    if (props.swiped) {
      return toastStore.warn(`Confirm or cancel swiping before sending`)
    }

    ref.value = ''
    setText('')
    setCleared(0)

    props.send({
      msg: value,
      ooc: props.ooc,
      onSuccess: () => {
        draft.clear()
      },
      onError: () => {
        ref.value = value
        setText(value)
        draft.update(value)
      },
    })
  }, 100)

  const createImage = () => {
    msgStore.createImage({})
    setMenu(false)
  }

  const respondAgain = () => {
    responseStore.request(props.chat._id, props.chat.characterId)
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

    const text = extractReasoning(lastTextMsg.msg, {
      tags: preset.current?.reasoning,
      display: ctx.ui.displayReasoning,
    })

    responseStore.textToSpeech(
      lastTextMsg._id,
      text.content,
      char.voice,
      props.char?.culture || defaultCulture
    )
    setMenu(false)
  }

  const triggerEvent = () => {
    const char = ctx.replyAs && ctx.replyAs in props.botMap ? props.botMap[ctx.replyAs] : undefined

    eventStore.triggerEvent(props.chat, char)
    setMenu(false)
  }

  const onMoreClick = () => setMenu(true)

  const setAutoReplyAs = (charId: string) => {
    chatStore.setAutoReplyAs(charId)
    setMenu(false)
  }

  onCleanup(() => {
    disposeSaveDraftDebounce()
  })

  createEffect(
    on(
      () => props.chat._id,
      (id) => promptStore.loadHint(id)
    )
  )

  const onFile = async (files: FileInputResult[]) => {
    setDragging(false)
    setMenu(false)

    await attach(files.map((f) => f.file))
  }

  const onCapture = (image: string) => {
    msgStore.addAttachment(props.chat._id, [{ type: 'image', image }])
  }

  const attach = async (files: File[]) => {
    try {
      setMenu(false)
      const toAttach: MsgAttachment[] = []

      for (const file of files) {
        const ext = file.name.split('.').slice(-1)[0].toLowerCase()
        const isAllowed = ALLOWED_TYPES.has(ext)
        if (!isAllowed) {
          toastStore.warn(`Invalid file type: Must be an image`)
          return
        }

        if (file.size > 1024 * 1024 * 1024) {
          toastStore.warn(`Attachment exceeds size limit (1MB)`)
          return
        }

        const proc = await imageApi.processImageFile(file)
        const resized = await resizeImage(proc, { type: 'fit', max: 768 })
        debug('resize')(
          'Orig: %sx%s, New: %sx%s',
          resized.original.w,
          resized.original.h,
          resized.w,
          resized.h
        )
        toAttach.push({ type: 'image', image: resized.content })
      }

      msgStore.addAttachment(props.chat._id, toAttach)
    } catch (ex: any) {
      toastStore.error(`Failed to attach`, { stack: ex.stack })
    }
  }

  return (
    <>
      <Show when={window.flags.debug}>
        <div class="mb-2 flex justify-center gap-2">
          <Pill small inverse>
            <b>Leaf:&nbsp;</b>
            {ctx.active?.chat?.treeLeafId?.slice(0, 4)}
          </Pill>

          <Pill small inverse>
            <b>Cutoff:&nbsp;</b>
            {ctx.showMessageCount}
          </Pill>
        </div>
      </Show>

      <Show when={prompt.hintsEnabled}>
        <div class="flex w-full justify-center pb-0.5">
          <div
            class="flex flex-1 justify-center gap-0.5 sm:w-3/4 sm:max-w-[75%]"
            classList={{ '!w-full': window.flags.debug === true }}
          >
            <TextInput
              class="max-h-[80px] !outline-0"
              parentClass="!p-0.5 text-sm flex flex-1"
              placeholder="Response hint..."
              value={prompt.hint}
              onChange={(ev) =>
                promptStore.hint({ chatId: props.chat._id, text: ev.currentTarget.value })
              }
              isMultiline
              growup
            />
            <div
              class="icon-button flex w-fit items-center"
              onClick={() => promptStore.hint({ chatId: props.chat._id, text: '' })}
            >
              <X size={20} />
            </div>
          </div>
        </div>
      </Show>

      <div class="relative flex items-start justify-center rounded-md bg-[var(--bg-800)]">
        <Show when={ctx.waiting?.signal}>
          <button
            class="animate-pulse cursor-pointer p-2"
            onClick={(ev) => {
              ev.preventDefault()
              console.log('Cancel clicked', !!ctx.waiting?.signal)
              responseStore.abortMessage()
            }}
          >
            <StopCircle />
          </button>
        </Show>
        <Show when={props.showOocToggle}>
          <div class="flex h-[40px] cursor-pointer items-center p-2" onClick={toggleOoc}>
            <Show when={!props.ooc}>
              <WizardIcon />
            </Show>
            <Show when={props.ooc}>
              <NoCharacterIcon color="var(--bg-500)" />
            </Show>
          </div>
        </Show>

        <div class="flex h-[40px] items-center sm:hidden">
          <a
            href="#"
            role="button"
            aria-label="Open impersonation menu"
            class="icon-button"
            onClick={() => pageStore.toggleImpersonate(true)}
          >
            <AvatarIcon
              avatarUrl={chars.impersonating?.avatar || user.profile?.avatar}
              format={{ corners: 'circle', size: 'sm' }}
              class="ml-1 mr-2"
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
        <Show when={!!emojiToken()}>
          <div class="bg-800 absolute bottom-full left-0 z-50 mb-1 flex items-center gap-1 rounded-md border-[1px] border-[var(--bg-600)] p-2">
            <Show
              when={emojiMatches().length}
              fallback={<div class="text-400 px-1 py-1 text-sm">No matching emojis</div>}
            >
              <For each={emojiMatches()}>
                {([emoji, name], i) => (
                  <button
                    type="button"
                    title={name}
                    class="cursor-pointer rounded-md p-1 text-xl leading-none"
                    classList={{
                      'bg-[var(--bg-600)]': i() === emojiIndex(),
                      'hover:bg-[var(--bg-700)]': i() !== emojiIndex(),
                    }}
                    onClick={() => pickEmoji(emoji)}
                    onMouseDown={(ev) => ev.preventDefault()}
                  >
                    {emoji}
                  </button>
                )}
              </For>
            </Show>
          </div>
        </Show>
        <EmojiPicker onSelect={insertEmoji} />
        <TextInput
          fieldName="chatInput"
          isMultiline
          spellcheck
          lang={props.char?.culture}
          ref={ref! as any}
          value={text()}
          placeholder={placeholder()}
          parentClass="flex w-full"
          classList={{ 'blur-md': dragging() }}
          class="input-bar max-h-[120px] min-h-[40px] rounded-r-none !border-0 !outline-0 hover:bg-[var(--bg-800)] active:bg-[var(--bg-800)]"
          onKeyDown={(ev) => {
            const token = emojiToken()

            // Quick emoji search is active: only intercept navigation / selection keys.
            // Regular typing, backspace, space... go into the message and re-parse the token.
            if (token) {
              const matches = emojiMatches()

              if (ev.key === 'Escape') {
                setEmojiDismissedAt(token.start)
                setEmojiToken(null)
                return
              }
              if (ev.key === 'ArrowLeft' && emojiIndex() > 0) {
                setEmojiIndex((i) => i - 1)
                ev.preventDefault()
                return
              }
              if (ev.key === 'ArrowRight' && emojiIndex() < matches.length - 1) {
                setEmojiIndex((i) => i + 1)
                ev.preventDefault()
                return
              }
              if (ev.key === 'Enter' && !ev.shiftKey && matches.length) {
                pickEmoji(matches[emojiIndex()]?.[0])
                ev.preventDefault()
                return
              }
              // No matches: Enter falls through to normal send behavior
            }

            if (ev.key === '@') {
              setComplete(true)
            }

            const canMobileSend = mob() ? user.ui.mobileSendOnEnter : true
            if (ev.key === 'Enter' && !ev.shiftKey && canMobileSend) {
              if (complete()) return
              send()
              ev.preventDefault()
            }
          }}
          onChange={updateText}
          textarea={{
            onBlur: () => setEmojiToken(null),
            onSelect: () => parseEmojiToken(),
            onDragOver: (ev) => {
              console.log('on-drag-over', ev.dataTransfer?.files?.[0]?.size)
              setDragging(true)
            },
            onDragExit: () => {
              console.log('on-drag-exit')
              setDragging(false)
            },
            onDragEnd: (ev) => {
              console.log('drag-end', ev.dataTransfer?.files?.[0]?.size)
              setDragging(false)
            },
            onDrop: (ev) => {
              ev.preventDefault()
              console.log('onDrop', ev.dataTransfer?.files?.[0]?.size)
              setDragging(false)
              const file = ev.dataTransfer?.files[0]
              if (!file) return

              attach([file])
            },
          }}
        />

        <Button
          schema="clear"
          onClick={onMoreClick}
          class="tour-message-actions mt-1 h-full bg-[var(--bg-800)] px-2 py-2"
        >
          <MoreHorizontal class="icon-button" size={18} />
        </Button>

        <DropMenu show={menu()} close={() => setMenu(false)} vert="up" horz="left">
          <div class="flex w-48 flex-col gap-2 p-2">
            <Button
              schema="secondary"
              class="w-full"
              onClick={() => {
                setMenu(false)
                responseStore.selfGenerate()
              }}
              alignLeft
              disabled={!ctx.impersonate}
            >
              <MessageCircle size={18} />
              Respond as Me
            </Button>
            <Show when={ctx.activeBots.length > 1}>
              <div>Auto-reply</div>
              <Button
                schema="secondary"
                size="sm"
                onClick={() => setAutoReplyAs('')}
                disabled={!ctx.replyAs}
              >
                None
              </Button>
              <For each={ctx.activeBots}>
                {(char) => (
                  <Button
                    schema="secondary"
                    size="sm"
                    onClick={() => setAutoReplyAs(char._id)}
                    disabled={ctx.replyAs === char._id}
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
              <Show when={!!ctx.chat?.scenarioIds?.length && isOwner()}>
                <Button schema="secondary" class="w-full" onClick={triggerEvent} alignLeft>
                  <Zap /> Trigger Event
                </Button>
              </Show>
            </Show>
            <Show when={preset.attachments}>
              <FileInput
                fieldName="imageCaption"
                parentClass="hidden"
                onUpdate={onFile}
                accept="image/jpg,image/png,image/jpeg,image/webp"
                multiple
              />
              <LabelButton for="imageCaption" schema="secondary" class="w-full" alignLeft>
                <ImageUp size={18} />
                Attach Image
              </LabelButton>
            </Show>
            <Button
              schema="secondary"
              class="w-full"
              onClick={() => pageStore.openCapture((res) => onCapture(res.image))}
            >
              <ScanFaceIcon size={18} />
              Attach from Camera
            </Button>
          </div>
        </DropMenu>
        <Switch>
          <Match when={user.user?.speechtotext && (text() === '' || listening())}>
            <div class="flex h-full items-center">
              <SpeechRecognitionRecorder
                culture={props.char?.culture}
                onText={(value) => setText(value)}
                onSubmit={() => send()}
                cleared={cleared}
                listening={setListening}
                class="h-full bg-[var(--bg-800)]"
              />
            </div>
          </Match>

          <Match when>
            <Button schema="clear" onClick={send} class="mt-1">
              <Send class="icon-button" size={18} />
            </Button>
          </Match>
        </Switch>
      </div>
    </>
  )
}

export default InputBar
