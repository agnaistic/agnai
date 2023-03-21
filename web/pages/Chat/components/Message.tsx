import { Check, Pencil, RefreshCw, Terminal, ThumbsDown, ThumbsUp, Trash, X } from 'lucide-solid'
import showdown from 'showdown'
import { Component, createMemo, createSignal, For, Show } from 'solid-js'
import { BOT_REPLACE, SELF_REPLACE } from '../../../../common/prompt'
import { AppSchema } from '../../../../srv/db/schema'
import AvatarIcon from '../../../shared/AvatarIcon'
import { chatStore, userStore } from '../../../store'
import { MsgState, msgStore } from '../../../store'

const showdownConverter = new showdown.Converter()

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
    msgStore.editMessage(props.msg._id, ref.innerText)
    setEdit(false)
  }

  const resendMessage = () => {
    msgStore.resend(props.msg.chatId, props.msg._id)
  }

  const retryMessage = () => {
    msgStore.retry(props.msg.chatId)
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

  const msgText = createMemo(() => {
    if (props.last && props.swipe) return props.swipe
    return props.msg.msg
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
              class="text-600 flex items-center text-sm"
              data-bot-time={isBot}
              data-user-time={isUser()}
            >
              {new Date(props.msg.createdAt).toLocaleString()}
            </span>
            <Show when={props.msg.characterId && user.user?._id === props.chat?.userId && false}>
              <div class="text-200 ml-2 flex flex-row items-center gap-2">
                <ThumbsUp size={14} class="hover:text-100 mt-[-0.15rem] cursor-pointer" />
                <ThumbsDown size={14} class="hover:text-100 cursor-pointer" />
              </div>
            </Show>
          </div>
          <Show when={!edit() && !props.swipe && user.user?._id === props.chat?.userId}>
            <div
              class="mr-4 flex items-center gap-2 text-sm"
              data-bot-editing={isBot()}
              data-user-editing={isUser()}
            >
              <Show when={props.editing && (!props.msg.split || props.lastSplit)}>
                <Show when={!!props.msg.characterId}>
                  <Terminal size={16} onClick={showPrompt} class="icon-button" />
                </Show>
                <Pencil size={16} class="icon-button" onClick={startEdit} />
                <Trash size={16} class="icon-button" onClick={props.onRemove} />
              </Show>
              <Show when={props.last && props.msg.characterId}>
                <RefreshCw size={16} class="icon-button" onClick={retryMessage} />
              </Show>
              <Show when={props.last && !props.msg.characterId}>
                <RefreshCw size={16} class="cursor-pointer" onClick={resendMessage} />
              </Show>
            </div>
          </Show>
          <Show when={edit()}>
            <div class="mr-4 flex items-center gap-2 text-sm">
              <X size={16} class="cursor-pointer text-red-500" onClick={cancelEdit} />
              <Check size={16} class="cursor-pointer text-green-500" onClick={saveEdit} />
            </div>
          </Show>
          <Show when={props.last && props.swipe}>
            <div class="mr-4 flex items-center gap-2 text-sm">
              <X
                size={16}
                class="cursor-pointer text-red-500"
                onClick={() => props.cancelSwipe?.()}
              />
              <Check
                size={16}
                class="cursor-pointer text-green-500"
                onClick={() => props.confirmSwipe?.()}
              />
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
          <Show when={edit()}>
            <div ref={ref} contentEditable={true}></div>
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
