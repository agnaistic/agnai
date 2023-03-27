import { Check, Pencil, RefreshCw, Terminal, ThumbsDown, ThumbsUp, Trash, X } from 'lucide-solid'
import showdown from 'showdown'
import { Component, createMemo, createSignal, For, Show } from 'solid-js'
import { BOT_REPLACE, SELF_REPLACE } from '../../../../common/prompt'
import { AppSchema } from '../../../../srv/db/schema'
import AvatarIcon from '../../../shared/AvatarIcon'
import { toDuration } from '../../../shared/util'
import { chatStore, userStore } from '../../../store'
import { MsgState, msgStore } from '../../../store'

const showdownConverter = new showdown.Converter()

type MessageProps = {
  msg: SplitMessage
  chat: AppSchema.Chat
  char: AppSchema.Character
  last?: boolean
  swipe?: number
  confirmSwipe?: () => void
  onRemove: () => void
  editing: boolean
  retryMessage: () => void
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
          original={props.msg}
          editing={props.editing}
          retryMessage={props.retryMessage}
        />
      )}
    </For>
  )
}

const SingleMessage: Component<
  MessageProps & { original: AppSchema.ChatMessage; lastSplit: boolean }
> = (props) => {
  const user = userStore()
  const members = chatStore((s) => s.memberIds)

  const [edit, setEdit] = createSignal(false)

  const cancelEdit = () => {
    setEdit(false)
  }

  const saveEdit = () => {
    if (!ref) return
    const retries = msgStore.getState().retries[props.msg._id]
    if (retries) retries[props.swipe!] = ref.innerText
    props.confirmSwipe?.()
    msgStore.editMessage(props.msg._id, ref.innerText)

    setEdit(false)
  }

  const resendMessage = () => {
    msgStore.resend(props.msg.chatId, props.msg._id)
  }

  const startEdit = () => {
    setEdit(true)
    if (ref) {
      ref.innerText = msgText()
    }
    ref?.focus()
  }

  const showPrompt = () => {
    if (!user.user) return
    chatStore.showPrompt(user.user, props.msg)
  }

  const msgText = createMemo(() => {
    const retries = msgStore.getState().retries[props.msg._id]

    return retries ? retries[props.swipe!] : props.msg.msg
  })

  const isBot = createMemo(() => !!props.msg.characterId)
  const isUser = createMemo(() => !!props.msg.userId)

  let ref: HTMLDivElement | undefined

  const format = createMemo(() => ({
    size: user.ui.avatarSize,
    corners: user.ui.avatarCorners,
  }))

  return (
    <div
      class="flex w-full gap-4 rounded-l-md hover:bg-[var(--bg-800)]"
      data-sender={props.msg.characterId ? 'bot' : 'user'}
      data-bot={props.msg.characterId ? props.char?.name : ''}
      data-user={props.msg.userId ? members[props.msg.userId]?.handle : ''}
    >
      <div
        class="flex items-center justify-center"
        data-bot-avatar={isBot()}
        data-user-avatar={isUser()}
      >
        <Show when={props.char && !!props.msg.characterId}>
          <AvatarIcon avatarUrl={props.char?.avatar} bot={true} format={format()} />
        </Show>
        <Show when={!props.msg.characterId}>
          <AvatarIcon avatarUrl={members[props.msg.userId!]?.avatar} format={format()} />
        </Show>
      </div>

      <div class="flex w-full select-text flex-col">
        <div class="flex w-full flex-row justify-between">
          <div class="flex flex-row">
            <b class="text-900 mr-2" data-bot-name={isBot()} data-user-name={isUser()}>
              {props.msg.characterId ? props.char?.name! : members[props.msg.userId!]?.handle}
            </b>
            <span
              class="text-600 flex items-center text-xs"
              data-bot-time={isBot}
              data-user-time={isUser()}
            >
              {new Date(props.msg.createdAt).toLocaleString()}
            </span>
          </div>
          <Show when={!edit() && user.user?._id === props.chat?.userId}>
            <div
              class="mr-4 flex items-center gap-3 text-sm"
              data-bot-editing={isBot()}
              data-user-editing={isUser()}
            >
              <Show
                when={props.editing && props.msg._id != '' && (!props.msg.split || props.lastSplit)}
              >
                <Show when={!!props.msg.characterId}>
                  <div onClick={showPrompt} class="icon-button">
                    <Terminal size={18} />
                  </div>
                </Show>
                <div class="icon-button" onClick={startEdit}>
                  <Pencil size={18} />
                </div>
                <div class="icon-button" onClick={props.onRemove}>
                  <Trash size={18} />
                </div>
              </Show>
              <Show when={props.last && props.msg.characterId}>
                <div class="icon-button" onClick={props.retryMessage}>
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
        </div>
        <div class="break-words opacity-75">
          <Show when={!edit()}>
            <div
              data-bot-message={isBot()}
              data-user-message={isUser()}
              innerHTML={showdownConverter.makeHtml(
                parseMessage(msgText(), props.char!, user.profile!)
              )}
            />
          </Show>
          <Show when={props.msg._id === ''}>
            <div class="my-2 ml-5">
              <div class="dot-flashing bg-[var(--hl-700)]"></div>
            </div>
          </Show>
          <Show when={edit()}>
            <div ref={ref} contentEditable={true}></div>
          </Show>
          <Show when={props.msg.characterId && user.user?._id === props.chat?.userId && false}>
            <div class="text-400 my-2 ml-1 flex flex-row items-center gap-2">
              <ThumbsUp size={18} class="hover:text-100 mt-[-0.15rem] cursor-pointer" />
              <ThumbsDown size={18} class="hover:text-100 cursor-pointer" />
            </div>
          </Show>
        </div>
      </div>
    </div>
  )
}

export default Message

function parseMessage(msg: string, char: AppSchema.Character, profile: AppSchema.Profile) {
  return msg
    .replace(BOT_REPLACE, char.name)
    .replace(SELF_REPLACE, profile?.handle || 'You')
    .replace(/(<|>)/g, '*')
    .split('\n')
    .filter((v) => !!v)
    .join('\n\n')
}

export type SplitMessage = AppSchema.ChatMessage & { split?: boolean }

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
