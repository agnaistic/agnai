import {
  Check,
  DownloadCloud,
  PauseCircle,
  Pencil,
  RefreshCw,
  Terminal,
  Trash,
  X,
} from 'lucide-solid'
import { Accessor, Component, createMemo, createSignal, For, Match, Show, Switch } from 'solid-js'
import { BOT_REPLACE, SELF_REPLACE } from '../../../../common/prompt'
import { AppSchema } from '../../../../srv/db/schema'
import AvatarIcon from '../../../shared/AvatarIcon'
import { getAssetUrl, getRootVariable, hexToRgb } from '../../../shared/util'
import { chatStore, userStore, msgStore, settingStore } from '../../../store'
import { markdown } from '../../../shared/markdown'
import Loading from '/web/shared/Loading'

type MessageProps = {
  msg: SplitMessage
  chat: AppSchema.Chat
  char: AppSchema.Character
  last?: boolean
  swipe?: string | false
  confirmSwipe?: () => void
  cancelSwipe?: () => void
  onRemove: () => void
  editing: boolean
  anonymize?: boolean
  tts?: boolean
  children?: any
}

const Message: Component<MessageProps> = (props) => {
  const user = userStore()

  const splits = createMemo(() => splitMessage(props.char, user.profile!, props.msg), {
    equals: false,
  })

  return (
    <>
      <For each={splits()}>
        {(msg, i) => (
          <SingleMessage
            msg={msg}
            chat={props.chat}
            char={props.char}
            onRemove={props.onRemove}
            last={props.last && i() === splits().length - 1}
            lastSplit={i() === splits().length - 1}
            swipe={props.swipe}
            confirmSwipe={props.confirmSwipe}
            cancelSwipe={props.cancelSwipe}
            original={props.msg}
            editing={props.editing}
            anonymize={props.anonymize}
            children={props.children}
          />
        )}
      </For>
    </>
  )
}

const SingleMessage: Component<
  MessageProps & { original: AppSchema.ChatMessage; lastSplit: boolean }
> = (props) => {
  const user = userStore()
  const state = chatStore()
  const voice = msgStore((x) => ({
    status:
      props.lastSplit && x.speaking?.messageId === props.msg._id ? x.speaking.status : undefined,
  }))

  const [edit, setEdit] = createSignal(false)
  const isBot = createMemo(() => !!props.msg.characterId)
  const isUser = createMemo(() => !!props.msg.userId)
  const isImage = createMemo(() => props.original.adapter === 'image')

  const format = createMemo(() => ({ size: user.ui.avatarSize, corners: user.ui.avatarCorners }))

  const bgStyles = createMemo(() => {
    user.ui.mode
    const hex = getRootVariable(props.msg.ooc ? 'bg-1000' : 'bg-800')
    if (!hex) return {}

    const rgb = hexToRgb(hex)
    if (!rgb) return {}

    return {
      background: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${user.ui.msgOpacity.toString()})`,
    }
  })

  const msgText = createMemo(() => {
    if (props.last && props.swipe) return props.swipe
    if (!props.anonymize) {
      return props.msg.msg
    }

    return state.chatProfiles.reduce(anonymizeText, props.msg.msg).replace(SELF_REPLACE, 'User #1')
  })

  const saveEdit = () => {
    if (!ref) return
    msgStore.editMessage(props.msg._id, ref.innerText)
    setEdit(false)
  }

  const cancelEdit = () => setEdit(false)

  const startEdit = () => {
    setEdit(true)
    if (ref) {
      ref.innerText = props.original.msg
    }
    ref?.focus()
  }

  const handleToShow = () => {
    if (props.anonymize) return getAnonName(state.chatProfiles, props.msg.userId!)

    const handle = state.memberIds[props.msg.userId!]?.handle || props.msg.handle || 'You'
    return handle
  }

  const renderMessage = () => {
    // Address unfortunate Showdown bug where spaces in code blocks are replaced with nbsp, except
    // it also encodes the ampersand, which results in them actually being rendered as `&amp;nbsp;`
    // https://github.com/showdownjs/showdown/issues/669
    const html = markdown
      .makeHtml(parseMessage(msgText(), props.char!, user.profile!, props.msg.adapter))
      .replace(/&amp;nbsp;/g, '&nbsp;')
    return html
  }

  let ref: HTMLDivElement | undefined

  const opacityClass = props.msg.ooc ? 'opacity-50' : ''
  const imageHeight = createMemo(() => (user.ui.imageWrap ? '' : 'h-full'))

  return (
    <div
      class="flex w-full rounded-md py-2 px-2 pr-2 sm:px-4"
      style={bgStyles()}
      data-sender={props.msg.characterId ? 'bot' : 'user'}
      data-bot={props.msg.characterId ? props.char?.name : ''}
      data-user={props.msg.userId ? state.memberIds[props.msg.userId]?.handle : ''}
    >
      <div class={`flex w-full ${opacityClass}`}>
        <div class={`flex w-full select-text flex-col gap-1`}>
          <div class="break-words">
            <span
              class={`${imageHeight()} float-left pr-2`}
              data-bot-avatar={isBot()}
              data-user-avatar={isUser()}
            >
              <Switch>
                <Match when={voice.status === 'generating'}>
                  <div class="animate-pulse cursor-pointer" onClick={msgStore.stopSpeech}>
                    <AvatarIcon bot={true} format={format()} Icon={DownloadCloud} />
                  </div>
                </Match>

                <Match when={voice.status === 'playing'}>
                  <div class="animate-pulse cursor-pointer" onClick={msgStore.stopSpeech}>
                    <AvatarIcon bot={true} format={format()} Icon={PauseCircle} />
                  </div>
                </Match>

                <Match when={props.char && !!props.msg.characterId}>
                  <AvatarIcon
                    avatarUrl={
                      state.chatBotMap[props.msg.characterId!]?.avatar || props.char?.avatar
                    }
                    bot={true}
                    format={format()}
                  />
                </Match>

                <Match when={!props.msg.characterId}>
                  <AvatarIcon
                    avatarUrl={state.memberIds[props.msg.userId!]?.avatar}
                    format={format()}
                    anonymize={props.anonymize}
                  />
                </Match>
              </Switch>
            </span>
            <span class="flex flex-row justify-between">
              <span
                class={`flex flex-col items-start gap-1 sm:flex-row sm:items-end sm:gap-0 ${
                  props.msg.ooc ? 'italic' : ''
                }`}
              >
                <b
                  class="text-900 text-md mr-2 max-w-[160px] overflow-hidden  text-ellipsis whitespace-nowrap sm:max-w-[400px] sm:text-lg"
                  // Necessary to override text-md and text-lg's line height, for proper alignment
                  style="line-height: 1;"
                  data-bot-name={isBot()}
                  data-user-name={isUser()}
                >
                  {props.msg.characterId
                    ? state.chatBotMap[props.msg.characterId!]?.name || props.char?.name!
                    : handleToShow()}
                </b>
                {/* <span
                  class={`
                message-date
                text-600
                flex
                items-center
                text-xs
                leading-none
                ${visibilityClass()}
              `}
                  data-bot-time={isBot}
                  data-user-time={isUser()}
                >
                  {new Date(props.msg.createdAt).toLocaleString()}
                </span> */}
              </span>
              <Switch>
                <Match when={!edit() && !props.swipe && user.user?._id === props.chat?.userId}>
                  <MessageOptions
                    char={props.char}
                    original={props.original}
                    msg={props.msg}
                    chatEditing={props.editing}
                    edit={edit}
                    startEdit={startEdit}
                    onRemove={props.onRemove}
                    lastSplit={props.lastSplit}
                    last={props.last}
                    tts={!!props.tts}
                  />
                </Match>

                <Match when={edit()}>
                  <div class="mr-4 flex items-center gap-4 text-sm">
                    <div class="icon-button text-red-500" onClick={cancelEdit}>
                      <X size={22} />
                    </div>
                    <div class="icon-button text-green-500" onClick={saveEdit}>
                      <Check size={22} />
                    </div>
                  </div>
                </Match>

                <Match when={props.last && props.swipe}>
                  <div class="mr-4 flex items-center gap-4 text-sm">
                    <X
                      size={22}
                      class="cursor-pointer text-red-500"
                      onClick={() => props.cancelSwipe?.()}
                    />
                    <Check
                      size={22}
                      class="cursor-pointer text-green-500"
                      onClick={() => props.confirmSwipe?.()}
                    />
                  </div>
                </Match>
              </Switch>
            </span>
            <Switch>
              <Match when={isImage()}>
                <img
                  class={'mt-2 max-h-32 max-w-[unset] cursor-pointer rounded-md'}
                  src={getAssetUrl(props.msg.msg)}
                  onClick={() => settingStore.showImage(props.original.msg)}
                />
              </Match>
              <Match when={!edit() && !isImage() && props.msg._id !== ''}>
                <p
                  class="rendered-markdown"
                  data-bot-message={isBot()}
                  data-user-message={isUser()}
                  innerHTML={renderMessage()}
                />
              </Match>
              <Match when={props.msg._id === ''}>
                <div class="flex h-8 w-12 items-center justify-center">
                  <div class="dot-flashing bg-[var(--hl-700)]"></div>
                </div>
              </Match>
              <Match when={edit()}>
                <div
                  ref={ref}
                  contentEditable={true}
                  onKeyUp={(ev) => {
                    if (ev.key === 'Escape') cancelEdit()
                  }}
                ></div>
              </Match>
            </Switch>
          </div>
          {props.last && props.lastSplit && props.children}
        </div>
      </div>
    </div>
  )
}

export default Message

function parseMessage(
  msg: string,
  char: AppSchema.Character,
  profile: AppSchema.Profile,
  adapter?: string
) {
  if (adapter === 'image') {
    return msg.replace(BOT_REPLACE, char.name).replace(SELF_REPLACE, profile?.handle || 'You')
  }

  return msg
    .replace(BOT_REPLACE, char.name)
    .replace(SELF_REPLACE, profile?.handle || 'You')
    .replace(/(<)/g, '‹')
    .replace(/(>)/g, '›')
}

export type SplitMessage = AppSchema.ChatMessage & { split?: boolean; handle?: string }

function splitMessage(
  char: AppSchema.Character,
  profile: AppSchema.Profile,
  incoming: AppSchema.ChatMessage
): SplitMessage[] {
  const CHARS = [`${char.name}:`, `{{char}}:`]
  const USERS = [`${profile?.handle || 'You'}:`, `{{user}}:`]

  const msg = { ...incoming }
  if (msg.msg.startsWith(`${char.name}:`)) {
    msg.msg = msg.msg.replace(`${char.name}:`, '').trim()
  } else if (msg.msg.startsWith(`${char.name} :`)) {
    msg.msg = msg.msg.replace(`${char.name} :`, '').trim()
  }

  const next: AppSchema.ChatMessage[] = []

  const splits = msg.msg.split('\n')

  for (const split of splits) {
    const trim = split.trim()
    let newMsg: AppSchema.ChatMessage | undefined

    for (const CHAR of CHARS) {
      if (newMsg) break
      if (trim.startsWith(CHAR)) {
        newMsg = { ...msg, msg: trim.replace(CHAR, ''), characterId: char._id, userId: undefined }
        break
      }
    }

    for (const USER of USERS) {
      if (newMsg) break
      if (trim.startsWith(USER)) {
        newMsg = {
          ...msg,
          msg: trim.replace(USER, ''),
          userId: profile.userId,
          characterId: undefined,
        }
        break
      }
    }

    if (!next.length && !newMsg) return [msg]

    if (!newMsg) {
      const lastMsg = next.slice(-1)[0]
      lastMsg.msg += ` ${trim}`
      continue
    }

    next.push(newMsg)
    continue
  }

  if (!next.length || next.length === 1) return [msg]
  const newSplits = next.map((next) => ({ ...next, split: true }))
  return newSplits
}

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
  onRemove: () => void
}> = (props) => {
  return (
    <div class="flex items-center gap-3 text-sm">
      <Show when={props.chatEditing && props.msg.characterId && props.msg.adapter !== 'image'}>
        <div onClick={() => chatStore.showPrompt(props.original)} class="icon-button">
          <Terminal size={16} />
        </div>
      </Show>

      <Show when={props.chatEditing && props.original.adapter !== 'image'}>
        <div class="icon-button" onClick={props.startEdit}>
          <Pencil size={18} />
        </div>
      </Show>

      <Show when={props.chatEditing}>
        <div class="icon-button" onClick={props.onRemove}>
          <Trash size={18} />
        </div>
      </Show>

      <Show when={props.last && props.msg.characterId}>
        <div class="icon-button" onClick={() => retryMessage(props.original, props.msg)}>
          <RefreshCw size={18} />
        </div>
      </Show>

      <Show when={props.last && !props.msg.characterId}>
        <div
          class="cursor-pointer"
          onClick={() => msgStore.resend(props.msg.chatId, props.msg._id)}
        >
          <RefreshCw size={18} />
        </div>
      </Show>
    </div>
  )
}

function retryMessage(original: AppSchema.ChatMessage, split: SplitMessage) {
  if (original.adapter !== 'image') {
    msgStore.retry(split.chatId)
  } else {
    msgStore.createImage(split._id)
  }
}
