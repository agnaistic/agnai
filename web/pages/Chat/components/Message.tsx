import './Message.css'
import * as Purify from 'dompurify'
import {
  Check,
  DownloadCloud,
  Info,
  PauseCircle,
  Pencil,
  PlusCircle,
  RefreshCw,
  Terminal,
  Trash,
  X,
  Zap,
} from 'lucide-solid'
import {
  Accessor,
  Component,
  createMemo,
  createSignal,
  For,
  JSX,
  Match,
  onCleanup,
  onMount,
  Show,
  Signal,
  Switch,
} from 'solid-js'
import { BOT_REPLACE, SELF_REPLACE } from '../../../../common/prompt'
import { AppSchema } from '../../../../common/types/schema'
import AvatarIcon, { CharacterAvatar } from '../../../shared/AvatarIcon'
import { getAssetUrl, getStrictForm } from '../../../shared/util'
import { chatStore, userStore, msgStore, settingStore, toastStore, ChatState } from '../../../store'
import { markdown } from '../../../shared/markdown'
import Button from '/web/shared/Button'
import { rootModalStore } from '/web/store/root-modal'
import { ContextState, useAppContext } from '/web/store/context'
import { trimSentence } from '/common/util'
import { EVENTS, events } from '/web/emitter'
import TextInput from '/web/shared/TextInput'
import { Card } from '/web/shared/Card'

type MessageProps = {
  msg: SplitMessage
  last?: boolean
  swipe?: string | false
  confirmSwipe?: () => void
  cancelSwipe?: () => void
  onRemove: () => void
  editing: boolean
  tts?: boolean
  children?: any
  retrying?: AppSchema.ChatMessage
  partial?: string
  sendMessage: (msg: string, ooc: boolean) => void
  isPaneOpen: boolean
  showHiddenEvents?: boolean
}

const Message: Component<MessageProps> = (props) => {
  return (
    <SingleMessage
      msg={props.msg}
      onRemove={props.onRemove}
      swipe={props.swipe}
      confirmSwipe={props.confirmSwipe}
      cancelSwipe={props.cancelSwipe}
      original={props.msg}
      editing={props.editing}
      retrying={props.retrying}
      partial={props.partial}
      sendMessage={props.sendMessage}
      isPaneOpen={props.isPaneOpen}
      showHiddenEvents={props.showHiddenEvents}
      last
      lastSplit
    >
      {props.children}
    </SingleMessage>
  )
}

const SingleMessage: Component<
  MessageProps & { original: AppSchema.ChatMessage; lastSplit: boolean }
> = (props) => {
  let editRef: HTMLDivElement
  let avatarRef: any

  const [ctx] = useAppContext()
  const user = userStore()
  const state = chatStore()
  const voice = msgStore((x) => ({
    status:
      props.lastSplit && x.speaking?.messageId === props.msg._id ? x.speaking.status : undefined,
  }))

  const [edit, setEdit] = createSignal(false)
  const isBot = !!props.msg.characterId
  const isUser = !!props.msg.userId
  const [img, setImg] = createSignal('h-full')
  const opts = createSignal(false)

  const [obs] = createSignal(
    new ResizeObserver(() => {
      setImg(`calc(${Math.min(avatarRef?.clientHeight, 10000)}px + 1em)`)
    })
  )

  onMount(() => obs().observe(avatarRef))
  onCleanup(() => obs().disconnect())

  const bgStyles = createMemo(() => {
    const base: JSX.CSSProperties =
      props.msg.characterId && !props.msg.userId
        ? ctx.bg.bot
        : props.msg.ooc
        ? ctx.bg.ooc
        : ctx.bg.user

    const styles = { ...base }
    const show = opts[0]()
    if (show) {
      styles['backdrop-filter'] = ''
    }

    return styles
  })

  const content = createMemo(() => {
    const msgV2 = getMessageContent(ctx, props, state)
    return msgV2
  })

  const saveEdit = () => {
    if (!editRef) return
    msgStore.editMessage(props.msg._id, editRef.innerText)
    setEdit(false)
  }

  const cancelEdit = () => setEdit(false)

  const startEdit = () => {
    setEdit(true)
    if (editRef) {
      editRef.innerText = props.original.msg
    }
    editRef?.focus()
  }

  const handleToShow = () => {
    if (ctx.anonymize) return getAnonName(state.chatProfiles, props.msg.userId!)
    const handle = state.memberIds[props.msg.userId!]?.handle || props.msg.handle || 'You'
    return handle
  }

  const opacityClass = props.msg.ooc ? 'opacity-50' : ''

  const format = createMemo(() => ({ size: user.ui.avatarSize, corners: user.ui.avatarCorners }))

  return (
    <div
      class="flex w-full rounded-md px-2 py-2 pr-2 sm:px-4"
      style={bgStyles()}
      data-sender={props.msg.characterId ? 'bot' : 'user'}
      data-bot={props.msg.characterId ? ctx.char?.name : ''}
      data-user={props.msg.userId ? state.memberIds[props.msg.userId]?.handle : ''}
      data-last={props.last?.toString()}
      data-lastsplit={props.lastSplit?.toString()}
    >
      <div class={`flex w-full ${opacityClass}`}>
        <div class={`flex h-fit w-full select-text flex-col gap-1`}>
          <div class="break-words">
            <span
              class={`float-left pr-3`}
              style={{ 'min-height': user.ui.imageWrap ? '' : img() }}
              data-bot-avatar={isBot}
              data-user-avatar={isUser}
            >
              <Switch>
                <Match when={props.msg.event === 'world'}>
                  <div
                    class={`avatar-${format().size} flex shrink-0 items-center justify-center pt-3`}
                  >
                    <Zap />
                  </div>
                </Match>

                <Match when={voice.status === 'generating'}>
                  <div class="animate-pulse cursor-pointer" onClick={msgStore.stopSpeech}>
                    <AvatarIcon format={format()} Icon={DownloadCloud} />
                  </div>
                </Match>

                <Match when={voice.status === 'playing'}>
                  <div class="animate-pulse cursor-pointer" onClick={msgStore.stopSpeech}>
                    <AvatarIcon format={format()} Icon={PauseCircle} />
                  </div>
                </Match>

                <Match when={ctx.allBots[props.msg.characterId!]}>
                  <CharacterAvatar
                    char={ctx.allBots[props.msg.characterId!]}
                    format={format()}
                    openable
                    bot
                    zoom={1.75}
                  />
                </Match>

                {/* <Match when={!!ctx.allBots[props.msg.characterId!]}>
                  <CharacterAvatar
                    openable
                    char={ctx.allBots[props.msg.characterId!]}
                    format={format()}
                    bot={!props.msg.userId}
                    zoom={1.75}
                  />
                </Match> */}

                {/* <Match when={ctx.char && !!props.msg.characterId}>
                  <CharacterAvatar
                    char={
                      ctx.activeMap[props.msg.characterId!] ||
                      ctx.tempMap[props.msg.characterId!] ||
                      {}
                    }
                    openable
                    zoom={1.75}
                    bot={true}
                    format={format()}
                  />
                </Match> */}

                <Match when={!props.msg.characterId}>
                  <AvatarIcon
                    format={format()}
                    Icon={DownloadCloud}
                    avatarUrl={state.memberIds[props.msg.userId!]?.avatar}
                    anonymize={ctx.anonymize}
                  />
                </Match>
              </Switch>
            </span>
            <span class="flex flex-row justify-between pb-1">
              <span
                class={`flex min-w-0 shrink flex-col items-start gap-1 overflow-hidden`}
                classList={{
                  'sm:flex-col': props.isPaneOpen,
                  'sm:gap-1': props.isPaneOpen,
                  'sm:flex-row': !props.isPaneOpen,
                  'sm:gap-0': !props.isPaneOpen,
                  'sm:items-end': !props.isPaneOpen,
                  italic: props.msg.ooc,
                }}
              >
                <b
                  class={`chat-name text-900 mr-2 max-w-[160px] overflow-hidden  text-ellipsis whitespace-nowrap sm:max-w-[400px]`}
                  // Necessary to override text-md and text-lg's line height, for proper alignment
                  style="line-height: 1;"
                  data-bot-name={isBot}
                  data-user-name={isUser}
                  classList={{
                    hidden: !!props.msg.event,
                    'sm:text-base': props.isPaneOpen,
                    'sm:text-lg': !props.isPaneOpen,
                  }}
                >
                  <Switch>
                    <Match when={props.msg.characterId}>
                      {ctx.allBots[props.msg.characterId!]?.name ||
                        (props.msg.split && props.msg.characterId) ||
                        ctx.char?.name!}
                    </Match>
                    <Match when={true}>{handleToShow()}</Match>
                  </Switch>
                </b>

                <span
                  classList={{ invisible: ctx.anonymize }}
                  class={`message-date text-600 flex items-center text-xs leading-none`}
                  data-bot-time={isBot}
                  data-user-time={isUser}
                >
                  {new Date(props.msg.createdAt).toLocaleString()}
                  <Show when={canShowMeta(props.original, ctx.promptHistory[props.original._id])}>
                    <span
                      class="text-600 hover:text-900 ml-1 cursor-pointer"
                      onClick={() =>
                        rootModalStore.info(
                          <Meta
                            msg={props.original}
                            history={ctx.promptHistory[props.original._id]}
                          />
                        )
                      }
                    >
                      <Info size={14} />
                    </span>
                  </Show>
                </span>
              </span>
              <Switch>
                <Match
                  when={
                    !edit() &&
                    !props.swipe &&
                    user.user?._id === ctx.chat?.userId &&
                    ctx.chat?.mode !== 'companion'
                  }
                >
                  <MessageOptions
                    char={ctx.char!}
                    original={props.original}
                    msg={props.msg}
                    chatEditing={props.editing}
                    edit={edit}
                    startEdit={startEdit}
                    onRemove={props.onRemove}
                    lastSplit={props.lastSplit}
                    last={props.last}
                    tts={!!props.tts}
                    partial={props.partial}
                    show={opts}
                  />
                </Match>

                <Match when={edit()}>
                  <div class="cancel-edit-btn mr-4 flex items-center gap-4 text-sm">
                    <div class="icon-button text-red-500" onClick={cancelEdit}>
                      <X size={22} />
                    </div>
                    <div class="confirm-edit-btn icon-button text-green-500" onClick={saveEdit}>
                      <Check size={22} />
                    </div>
                  </div>
                </Match>

                <Match when={props.last && props.swipe}>
                  <div class="mr-4 flex items-center gap-4 text-sm">
                    <X size={22} class="cursor-pointer text-red-500" onClick={props.cancelSwipe} />
                    <Check
                      size={22}
                      class="cursor-pointer text-green-500"
                      onClick={props.confirmSwipe}
                    />
                  </div>
                </Match>
              </Switch>
            </span>
            <div ref={avatarRef}>
              <Switch>
                <Match when={props.msg.adapter === 'image'}>
                  <div class="flex flex-wrap gap-2">
                    <img
                      class={'mt-2 max-h-32 max-w-[unset] cursor-pointer rounded-md'}
                      src={getAssetUrl(props.msg.msg)}
                      onClick={() =>
                        settingStore.showImage(props.original.msg, [
                          toImageDeleteButton(props.msg._id, 0),
                        ])
                      }
                    />
                    <For each={props.original.extras || []}>
                      {(src, i) => (
                        <img
                          class={'mt-2 max-h-32 max-w-[unset] cursor-pointer rounded-md'}
                          src={getAssetUrl(src)}
                          onClick={() =>
                            settingStore.showImage(src, [
                              toImageDeleteButton(props.msg._id, i() + 1),
                            ])
                          }
                        />
                      )}
                    </For>
                    <div
                      class="icon-button mx-2 flex items-center"
                      onClick={() => msgStore.createImage(props.msg._id, true)}
                    >
                      <PlusCircle size={20} />
                    </div>
                  </div>
                </Match>
                <Match when={!edit() && content().type !== 'waiting'}>
                  <p
                    class={`rendered-markdown px-1 ${content().class}`}
                    data-bot-message={!props.msg.userId}
                    data-user-message={!!props.msg.userId}
                    innerHTML={content().message}
                  />
                  <Show when={!props.partial && props.last && props.lastSplit}>
                    <div class="flex items-center justify-center gap-2">
                      <For each={props.original.actions}>
                        {(item) => (
                          <Button
                            size="sm"
                            schema="gray"
                            onClick={() => sendAction(props.sendMessage, item)}
                          >
                            {item.emote}
                          </Button>
                        )}
                      </For>
                    </div>
                  </Show>
                </Match>
                <Match when={!edit() && content().type === 'waiting'}>
                  <div class="flex h-8 w-12 items-center justify-center">
                    <div class="dot-flashing bg-[var(--hl-700)]"></div>
                  </div>
                </Match>
                <Match when={edit()}>
                  <div
                    class="msg-edit-text-box"
                    ref={editRef!}
                    contentEditable={true}
                    onKeyUp={(ev) => {
                      if (ev.key === 'Escape') cancelEdit()
                      if (ev.altKey && ev.key === 's') {
                        ev.preventDefault()
                        saveEdit()
                      }
                    }}
                  ></div>
                </Match>
              </Switch>
            </div>
          </div>
          {props.last && props.lastSplit && props.children}
        </div>
      </div>
    </div>
  )
}

export default Message

export type SplitMessage = AppSchema.ChatMessage & { split?: boolean; handle?: string }

function getAnonName(members: AppSchema.Profile[], id: string) {
  for (let i = 0; i < members.length; i++) {
    if (members[i].userId === id) return `User #${i + 1}`
  }

  return `User ??`
}

function anonymizeText(text: string, profile: AppSchema.Profile, i: number) {
  return text.replace(new RegExp(profile.handle.trim(), 'gi'), 'User ' + (i + 1))
}

const MessageOptions: Component<{
  msg: SplitMessage
  char: AppSchema.Character
  original: AppSchema.ChatMessage
  chatEditing: boolean
  tts: boolean
  edit: Accessor<boolean>
  startEdit: () => void
  lastSplit: boolean
  last?: boolean
  partial?: string
  show: Signal<boolean>
  onRemove: () => void
}> = (props) => {
  return (
    <div class="flex items-center gap-3 text-sm">
      <Show when={props.chatEditing && props.msg.characterId && props.msg.adapter !== 'image'}>
        <div
          onClick={() => !props.partial && chatStore.showPrompt(props.original)}
          class="icon-button prompt-btn"
          classList={{ disabled: !!props.partial }}
        >
          <Terminal size={16} />
        </div>
      </Show>

      <Show when={props.chatEditing && props.original.adapter !== 'image'}>
        <div class="edit-btn icon-button" onClick={props.startEdit}>
          <Pencil size={18} />
        </div>
      </Show>

      <Show when={props.chatEditing}>
        <div class="delete-btn icon-button" onClick={props.onRemove}>
          <Trash size={18} />
        </div>
      </Show>

      <Show
        when={
          (props.last || (props.msg.adapter === 'image' && props.msg.imagePrompt)) &&
          props.msg.characterId
        }
      >
        <div
          class="icon-button refresh-btn"
          onClick={() => !props.partial && retryMessage(props.original, props.msg)}
        >
          <RefreshCw size={18} />
        </div>
      </Show>

      <Show when={props.last && !props.msg.characterId}>
        <div
          class="icon-button"
          onClick={() => !props.partial && msgStore.resend(props.msg.chatId, props.msg._id)}
        >
          <RefreshCw size={18} />
        </div>
      </Show>
    </div>
  )
}

function retryMessage(original: AppSchema.ChatMessage, split: SplitMessage) {
  if (original.adapter !== 'image') {
    msgStore.retry(split.chatId, original._id)
  } else {
    msgStore.createImage(split._id)
  }
}

function renderMessage(ctx: ContextState, text: string, isUser: boolean, adapter?: string) {
  // Address unfortunate Showdown bug where spaces in code blocks are replaced with nbsp, except
  // it also encodes the ampersand, which results in them actually being rendered as `&amp;nbsp;`
  // https://github.com/showdownjs/showdown/issues/669

  const html = Purify.sanitize(
    wrapWithQuoteElement(
      markdown.makeHtml(parseMessage(text, ctx, isUser, adapter)).replace(/&amp;nbsp;/g, '&nbsp;')
    )
  )

  return html
}

function wrapWithQuoteElement(str: string) {
  return str.replace(
    // we first match code blocks AND html tags
    // to ensure we do NOTHING to what's inside them
    // then we match "regular quotes" and“'pretty quotes” as capture group
    /<[\s\S]*?>|```[\s\S]*?```|``[\s\S]*?``|`[\s\S]*?`|(\".+?\")|(\u201C.+?\u201D)/gm,
    wrapCaptureGroups
  )
}

/** For use as a String#replace(str, cb) callback */
function wrapCaptureGroups(
  match: string,
  regularQuoted?: string /** regex capture group 1 */,
  curlyQuoted?: string /** regex capture group 2 */
) {
  if (regularQuoted) {
    return '<q>"' + regularQuoted.replace(/\"/g, '') + '"</q>'
  } else if (curlyQuoted) {
    return '<q>“' + curlyQuoted.replace(/\u201C|\u201D/g, '') + '”</q>'
  } else {
    return match
  }
}

function sendAction(_send: MessageProps['sendMessage'], { emote, action }: AppSchema.ChatAction) {
  events.emit(EVENTS.setInputText, action)
}

function parseMessage(msg: string, ctx: ContextState, isUser: boolean, adapter?: string) {
  if (adapter === 'image') {
    return msg.replace(BOT_REPLACE, ctx.char?.name || '').replace(SELF_REPLACE, ctx.handle)
  }

  const parsed = msg.replace(BOT_REPLACE, ctx.char?.name || '').replace(SELF_REPLACE, ctx.handle)
  return parsed
}

const Meta: Component<{ msg: AppSchema.ChatMessage; history?: any }> = (props) => {
  let ref: any

  if (!props.msg) return null
  if (!props.msg.meta && !props.history && !props.msg.adapter) return null

  const updateImagePrompt = () => {
    const { imagePrompt } = getStrictForm(ref, { imagePrompt: 'string' })
    msgStore.editMessageProp(props.msg._id, { imagePrompt }, () => {
      toastStore.success('Image prompt updated')
    })
  }

  return (
    <form ref={ref} class="flex w-full flex-col gap-2">
      <Card>
        <table class="text-sm">
          <Show when={props.msg.adapter}>
            <tr>
              <td class="pr-2">
                <b>Adapter</b>
              </td>
              <td>{props.msg.adapter}</td>
            </tr>
          </Show>
          <For each={Object.entries(props.msg.meta || {})}>
            {([key, value]) => (
              <tr>
                <td class="pr-2">
                  <b>{key}</b>
                </td>
                <td>{value as string}</td>
              </tr>
            )}
          </For>
        </table>
      </Card>

      <Show when={props.msg.imagePrompt}>
        <Card>
          <TextInput
            helperText={
              <>
                Image Prompt -{' '}
                <span class="link" onClick={updateImagePrompt}>
                  Save
                </span>
              </>
            }
            parentClass="text-sm"
            isMultiline
            value={props.msg.imagePrompt}
            fieldName="imagePrompt"
          />
        </Card>
      </Show>

      <Show when={props.history}>
        <pre class="overflow-x-auto whitespace-pre-wrap break-words rounded-sm bg-[var(--bg-700)] p-1 text-sm">
          <Show
            when={typeof props.history === 'string'}
            fallback={JSON.stringify(props.history, null, 2)}
          >
            {props.history}
          </Show>
        </pre>
      </Show>
    </form>
  )
}

function canShowMeta(msg: AppSchema.ChatMessage, history: any) {
  if (!msg) return false
  if (msg._id === 'partial') return false
  return !!msg.adapter || !!history || (!!msg.meta && Object.keys(msg.meta).length >= 1)
}

function toImageDeleteButton(msgId: string, position: number) {
  return {
    schema: 'red' as const,
    text: 'Delete Image',
    onClick: () => {
      msgStore.removeMessageImage(msgId, position)
      settingStore.clearImage()
    },
  }
}

function getMessageContent(
  ctx: ContextState,
  props: MessageProps & { original: AppSchema.ChatMessage; lastSplit: boolean },
  state: ChatState
) {
  const isRetry = props.retrying?._id === props.original._id
  const isPartial = props.msg._id === 'partial'

  if (isRetry || isPartial) {
    if (props.partial) {
      return {
        type: 'partial',
        message: renderMessage(ctx, props.partial!, false, 'partial'),
        class: 'streaming-markdown',
      }
    }

    if (isPartial && props.msg.msg) {
      return {
        type: 'partial',
        message: renderMessage(ctx, props.msg.msg, false, 'partial'),
        class: 'streaming-markdown',
      }
    }

    return { type: 'waiting', message: '', class: 'not-streaming' }
  }

  let message = props.msg.msg

  if (props.last && props.swipe) message = props.swipe
  if (props.msg.event && !props.showHiddenEvents) {
    message = message.replace(/\(OOC:.+\)/, '')
  }

  if (ctx.anonymize) {
    message = state.chatProfiles.reduce(anonymizeText, message).replace(SELF_REPLACE, 'User #1')
  }

  if (ctx.trimSentences && !props.msg.userId) {
    message = trimSentence(message)
  }

  return {
    type: 'message',
    message: renderMessage(ctx, message, !!props.msg.userId, props.original.adapter),
    class: 'not-streaming',
  }
}

// function toMessageContext=

// function splitMessage(incoming: AppSchema.ChatMessage): SplitMessage[] {
// const charName =
//   (incoming.characterId ? ctx.allBots[incoming.characterId]?.name : ctx.char?.name) || ''

// const CHARS = [`{{char}}:`]
// if (charName) CHARS.push(`${charName}:`)

// const USERS = [`${ctx.handle}:`, `{{user}}:`]

// const msg = { ...incoming }
// if (msg.msg.startsWith(`${charName}:`)) {
//   msg.msg = msg.msg.replace(`${charName}:`, '').trim()
// } else if (msg.msg.startsWith(`${charName} :`)) {
//   msg.msg = msg.msg.replace(`${charName} :`, '').trim()
// }

// const next: AppSchema.ChatMessage[] = []

// const splits = msg.msg.split('\n')

// for (const split of splits) {
//   const trim = split.trim()

//   let newMsg: AppSchema.ChatMessage | undefined

//   // for (const CHAR of ctx.activeBots) {
//   //   if (trim.startsWith(CHAR.name + ':')) {
//   //     newMsg = {
//   //       ...msg,
//   //       msg: trim.slice(CHAR.name.length + 1).trim(),
//   //       characterId: CHAR._id,
//   //       state: CHAR._id,
//   //     }
//   //   }
//   // }

//   for (const USER of USERS) {
//     if (newMsg) break
//     if (trim.startsWith(USER)) {
//       newMsg = {
//         ...msg,
//         msg: trim.replace(USER, ''),
//         userId: ctx.profile?.userId || '',
//         characterId: ctx.impersonate?._id,
//         state: 'user',
//       }
//       break
//     }
//   }

//   if (!newMsg) {
//     newMsg = {
//       ...msg,
//       msg: trim,
//       characterId: incoming.characterId,
//       userId: incoming.userId,
//       state: incoming.characterId,
//     }
//   }

//   if (next.length) {
//     const lastMsg = next.slice(-1)[0]
//     if (lastMsg.state === newMsg.state) {
//       lastMsg.msg += ` ${trim}`
//       continue
//     }
//   }

//   if (newMsg?.msg.length) {
//     const suffix = next.length === 0 ? '' : `-${next.length}`
//     newMsg._id = `${newMsg._id}${suffix}`
//     next.push(newMsg)
//   }
//   continue
// }

// if (!next.length || next.length === 1) return [msg]
// const newSplits = next.map((next) => ({ ...next, split: true }))
// return newSplits
// }
