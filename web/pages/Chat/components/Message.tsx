import { Check, Pencil, RefreshCw, ThumbsDown, ThumbsUp, Trash, X } from 'lucide-solid'
import showdown from 'showdown'
import { Component, createMemo, createSignal, For, Show } from 'solid-js'
import { BOT_REPLACE, SELF_REPLACE } from '../../../../common/prompt'
import { AppSchema } from '../../../../srv/db/schema'
import AvatarIcon from '../../../shared/AvatarIcon'
import { chatStore, userStore } from '../../../store'
import { MsgState, msgStore } from '../../../store/message'

const showdownConverter = new showdown.Converter()

const Message: Component<{
  msg: SplitMessage
  chat: AppSchema.Chat
  char: AppSchema.Character
  last?: boolean
  swipe?: MsgState['swipe']
  onRemove: () => void
}> = (props) => {
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
          swipe={props.swipe}
        />
      )}
    </For>
  )
}

const SingleMessage: Component<{
  msg: SplitMessage
  chat: AppSchema.Chat
  char: AppSchema.Character
  last?: boolean
  swipe: MsgState['swipe']
  onRemove: () => void
}> = (props) => {
  const user = userStore()
  const members = chatStore((s) => s.memberIds)

  const [edit, setEdit] = createSignal(false)

  const cancelEdit = () => {
    setEdit(false)
  }

  const saveEdit = () => {
    if (!ref) return
    setEdit(false)

    msgStore.editMessage(props.msg._id, ref.innerText)
  }

  const resendMessage = () => {
    msgStore.resend(props.msg.chatId, props.msg._id)
  }

  const retryMessage = () => {
    msgStore.retry(props.msg.chatId)
  }

  const startEdit = () => {
    if (ref) {
      ref.innerText = props.msg.msg
    }

    setEdit(true)
    ref?.focus()
  }

  const swipeText = createMemo(() => {
    if (!props.swipe) return
    if (props.swipe.msgId !== props.msg._id) return
    if (!props.msg.characterId) return

    const text = props.swipe.list[props.swipe.pos]
    if (text === props.msg.msg) return
    return text
  })

  const clearSwipe = () => {
    msgStore.setSwipe()
  }

  const saveSwipe = () => {
    const text = swipeText()
    if (!text) return

    msgStore.editMessage(props.msg._id, text)
  }

  let ref: HTMLDivElement | undefined

  return (
    <div
      class="flex w-full gap-4 rounded-l-md hover:bg-[var(--bg-800)]"
      data-sender={props.msg.characterId ? 'bot' : 'user'}
      data-bot={props.msg.characterId ? props.char?.name : ''}
      data-user={props.msg.userId ? members[props.msg.userId]?.handle : ''}
    >
      <div class="flex w-12 items-center justify-center">
        <Show when={props.char && !!props.msg.characterId}>
          <AvatarIcon avatarUrl={props.char?.avatar} bot />
        </Show>
        <Show when={!props.msg.characterId}>
          <AvatarIcon avatarUrl={members[props.msg.userId!]?.avatar} />
        </Show>
      </div>

      <div class="flex w-full select-text flex-col">
        <div class="flex w-full flex-row justify-between">
          <div class="flex flex-row">
            <b class="mr-2 text-white">
              {props.msg.characterId ? props.char?.name! : members[props.msg.userId!]?.handle}
            </b>
            <span class="text-sm text-white/30">
              {new Date(props.msg.createdAt).toLocaleString()}
            </span>
            <Show when={props.msg.characterId && user.user?._id === props.chat?.userId && false}>
              <div class="ml-2 flex flex-row items-center gap-2 text-white/10">
                <ThumbsUp size={14} class="mt-[-0.15rem] cursor-pointer hover:text-white" />
                <ThumbsDown size={14} class="cursor-pointer hover:text-white" />
              </div>
            </Show>
          </div>
          <Show when={!edit() && user.user?._id === props.chat?.userId}>
            <div class="mr-4 flex items-center gap-2 text-sm">
              <Show when={props.last && props.msg.characterId}>
                <RefreshCw
                  size={16}
                  class="cursor-pointer text-white/20 hover:text-white"
                  onClick={retryMessage}
                />
              </Show>
              <Show when={props.last && !props.msg.characterId}>
                <RefreshCw size={16} class="cursor-pointer" onClick={resendMessage} />
              </Show>
              <Show when={!props.msg.split}>
                <Pencil
                  size={16}
                  class="cursor-pointer text-white/20 hover:text-white"
                  onClick={startEdit}
                />
                <Trash
                  size={16}
                  class="cursor-pointer text-white/20 hover:text-white"
                  onClick={props.onRemove}
                />
              </Show>
            </div>
          </Show>
          <Show when={edit()}>
            <div class="mr-4 flex items-center gap-2 text-sm">
              <X size={16} class="cursor-pointer text-red-500" onClick={cancelEdit} />
              <Check size={16} class="cursor-pointer text-green-500" onClick={saveEdit} />
            </div>
          </Show>
          <Show when={swipeText()}>
            <div class="mr-4 flex items-center gap-2 text-sm">
              <X size={16} class="cursor-pointer text-red-500" onClick={clearSwipe} />
              <Check size={16} class="cursor-pointer text-green-500" onClick={saveSwipe} />
            </div>
          </Show>
        </div>
        <div class="break-words opacity-75">
          <Show when={!edit()}>
            <div
              innerHTML={showdownConverter.makeHtml(
                parseMessage(swipeText() || props.msg.msg, props.char!, user.profile!)
              )}
            />
          </Show>
          <Show when={edit()}>
            <div ref={ref} contentEditable={true}>
              {props.msg.msg}
            </div>
          </Show>
        </div>
      </div>
    </div>
  )
}

export default Message

function parseMessage(msg: string, char: AppSchema.Character, profile: AppSchema.Profile) {
  return msg.replace(BOT_REPLACE, char.name).replace(SELF_REPLACE, profile?.handle || 'You')
}

export type SplitMessage = AppSchema.ChatMessage & { split?: boolean }

function splitMessage(
  char: AppSchema.Character,
  profile: AppSchema.Profile,
  msg: AppSchema.ChatMessage
): SplitMessage[] {
  const CHARS = [`${char.name}:`, `{{char}}:`]
  const USERS = [`${profile.handle || 'You'}:`, `{{user}}:`]

  const next: AppSchema.ChatMessage[] = []

  const splits = msg.msg.split('\n')
  if (splits.length === 1) {
    next.push(msg)
  }

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
