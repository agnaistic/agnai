import { Check, Pencil, RefreshCw, Terminal, ThumbsDown, ThumbsUp, Trash, X } from 'lucide-solid'
import { Component, createMemo, createSignal, For, Show } from 'solid-js'
import { BOT_REPLACE, SELF_REPLACE } from '../../../../common/prompt'
import { AppSchema } from '../../../../srv/db/schema'
import AvatarIcon from '../../../shared/AvatarIcon'
import { getAssetUrl, getRootVariable, hexToRgb } from '../../../shared/util'
import { chatStore, userStore } from '../../../store'
import { msgStore } from '../../../store'
import { markdown } from '../../../shared/markdown'
import { avatarSizes, avatarSizesCircle } from '../../../shared/avatar-util'

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
}

const Message: Component<MessageProps> = (props) => {
  const user = userStore()

  const splits = createMemo(
    () => {
      const next = splitMessage(props.char, user.profile!, props.msg)
      return next
    },
    { equals: false }
  )

  return (
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
        />
      )}
    </For>
  )
}

const SingleMessage: Component<
  MessageProps & { original: AppSchema.ChatMessage; lastSplit: boolean }
> = (props) => {
  const user = userStore()
  const state = chatStore()

  const [edit, setEdit] = createSignal(false)
  const isBot = createMemo(() => !!props.msg.characterId)
  const isUser = createMemo(() => !!props.msg.userId)
  const isImage = createMemo(() => props.original.adapter === 'image')

  const format = createMemo(() => ({ size: user.ui.avatarSize, corners: user.ui.avatarCorners }))

  const bgStyles = createMemo(() => {
    user.ui.mode
    const hex = getRootVariable('bg-800')
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
  const resendMessage = () => msgStore.resend(props.msg.chatId, props.msg._id)
  const visibilityClass = () => (props.anonymize ? 'invisible' : '')
  const retryMessage = () => {
    if (props.original.adapter !== 'image') {
      msgStore.retry(props.msg.chatId)
    } else {
      msgStore.createImage(props.msg._id)
    }
  }

  const startEdit = () => {
    setEdit(true)
    if (ref) {
      ref.innerText = props.original.msg
    }
    ref?.focus()
  }

  const showPrompt = () => {
    if (!user.user) return
    chatStore.showPrompt(user.user, props.msg)
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

  const messageColumnWidth = () =>
    format().corners === 'circle'
      ? avatarSizesCircle[format().size].msg
      : avatarSizes[format().size].msg

  let ref: HTMLDivElement | undefined

  return (
    <div
      class="flex w-full rounded-md py-2 px-2 pr-2 sm:px-4"
      style={bgStyles()}
      data-sender={props.msg.characterId ? 'bot' : 'user'}
      data-bot={props.msg.characterId ? props.char?.name : ''}
      data-user={props.msg.userId ? state.memberIds[props.msg.userId]?.handle : ''}
    >
      <div
        class="flex items-start justify-center pr-4"
        data-bot-avatar={isBot()}
        data-user-avatar={isUser()}
      >
        <Show when={props.char && !!props.msg.characterId}>
          <AvatarIcon avatarUrl={props.char?.avatar} bot={true} format={format()} />
        </Show>
        <Show when={!props.msg.characterId}>
          <AvatarIcon
            avatarUrl={state.memberIds[props.msg.userId!]?.avatar}
            format={format()}
            anonymize={props.anonymize}
          />
        </Show>
      </div>

      <div class={`${messageColumnWidth()} flex w-full select-text flex-col gap-1`}>
        <div class="flex w-full flex-row justify-between">
          <div class="flex flex-col items-start gap-1 sm:flex-row sm:items-end sm:gap-0">
            <b
              class="text-900 text-md mr-2 max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap sm:max-w-[400px] sm:text-lg"
              // Necessary to override text-md and text-lg's line height, for proper alignment
              style="line-height: 1;"
              data-bot-name={isBot()}
              data-user-name={isUser()}
            >
              {props.msg.characterId ? props.char?.name! : handleToShow()}
            </b>
            <span
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
            </span>
          </div>
          <Show when={!edit() && !props.swipe && user.user?._id === props.chat?.userId}>
            <div
              class="mr-4 flex items-center gap-3 text-sm"
              data-bot-editing={isBot()}
              data-user-editing={isUser()}
            >
              <Show when={props.editing && (!props.msg.split || props.lastSplit)}>
                <Show when={!!props.msg.characterId && !isImage()}>
                  <div onClick={showPrompt} class="icon-button">
                    <Terminal size={16} />
                  </div>
                </Show>
                <Show when={!isImage()}>
                  <div class="icon-button" onClick={startEdit}>
                    <Pencil size={18} />
                  </div>
                </Show>
                <div class="icon-button" onClick={props.onRemove}>
                  <Trash size={18} />
                </div>
              </Show>
              <Show when={props.last && props.msg.characterId}>
                <div class="icon-button" onClick={retryMessage}>
                  <RefreshCw size={18} />
                </div>
              </Show>
              <Show when={props.last && !props.msg.characterId}>
                <div class="cursor-pointer" onClick={resendMessage}>
                  <RefreshCw size={18} />
                </div>
              </Show>
            </div>
          </Show>
          <Show when={edit()}>
            <div class="mr-4 flex items-center gap-4 text-sm">
              <div class="icon-button text-red-500" onClick={cancelEdit}>
                <X size={22} />
              </div>
              <div class="icon-button text-green-500" onClick={saveEdit}>
                <Check size={22} />
              </div>
            </div>
          </Show>
          <Show when={props.last && props.swipe}>
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
          </Show>
        </div>
        <div class={`w-full break-words`}>
          <Show when={isImage()}>
            <div class="flex justify-start">
              <img
                class="max-h-32 cursor-pointer rounded-md"
                src={getAssetUrl(props.msg.msg)}
                onClick={() => msgStore.showImage(props.original)}
              />
            </div>
          </Show>
          <Show when={!edit() && !isImage()}>
            <div
              class="rendered-markdown pr-1 sm:pr-3"
              data-bot-message={isBot()}
              data-user-message={isUser()}
              innerHTML={renderMessage()}
            />
          </Show>
          <Show when={props.msg._id === ''}>
            <div class="my-2 ml-4">
              <div class="dot-flashing bg-[var(--hl-700)]"></div>
            </div>
          </Show>
          <Show when={edit()}>
            <div
              ref={ref}
              contentEditable={true}
              onKeyUp={(ev) => {
                if (ev.key === 'Escape') cancelEdit()
              }}
            ></div>
          </Show>
          <Show when={false}>
            <div class="text-900 mt-2 flex flex-row items-center gap-2">
              <ThumbsUp size={14} class="hover:text-600 mt-[-0.15rem] cursor-pointer" />
              <ThumbsDown size={14} class="hover:text-600 cursor-pointer" />
            </div>
          </Show>
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
