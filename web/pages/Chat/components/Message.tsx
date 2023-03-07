import { Check, Pencil, RefreshCw, ThumbsDown, ThumbsUp, Trash, X } from 'lucide-solid'
import showdown from 'showdown'
import { Component, createSignal, Show } from 'solid-js'
import { AppSchema } from '../../../../srv/db/schema'
import AvatarIcon from '../../../shared/AvatarIcon'
import { chatStore, guestStore, userStore } from '../../../store'
import { msgStore } from '../../../store/message'

const showdownConverter = new showdown.Converter()

const Message: Component<{
  msg: AppSchema.ChatMessage
  chat?: AppSchema.Chat
  char?: AppSchema.Character
  last?: boolean
  onRemove: () => void
}> = (props) => {
  const user = userStore().loggedIn ? userStore() : guestStore()
  const members = userStore().loggedIn
    ? chatStore((s) => s.memberIds)
    : guestStore((s) => ({ [s.user._id]: s.profile }))

  const [edit, setEdit] = createSignal(false)

  const cancelEdit = () => {
    setEdit(false)
  }

  const saveEdit = () => {
    if (!ref) return
    setEdit(false)

    if (userStore().loggedIn) msgStore.editMessage(props.msg._id, ref.innerText)
  }

  const resendMessage = () => {
    if (userStore().loggedIn) msgStore.resend(props.msg.chatId, props.msg._id)
    else guestStore.recreateMessage(props.msg.chatId, props.msg._id)
  }

  const retryMessage = () => {
    if (userStore().loggedIn) msgStore.retry(props.msg.chatId)
    else guestStore.recreateMessage(props.msg.chatId, props.msg._id)
  }

  const startEdit = () => {
    if (ref) {
      ref.innerText = props.msg.msg
    }

    setEdit(true)
    ref?.focus()
  }

  let ref: HTMLDivElement | undefined

  return (
    <div class="flex w-full gap-4 rounded-l-md hover:bg-[var(--bg-800)]">
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
            <span class="text-sm text-white/25">
              {new Intl.DateTimeFormat('en-US', {
                dateStyle: 'short',
                timeStyle: 'short',
              }).format(new Date(props.msg.createdAt))}
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
            </div>
          </Show>
          <Show when={edit()}>
            <div class="mr-4 flex items-center gap-2 text-sm">
              <X size={16} class="cursor-pointer text-red-500" onClick={cancelEdit} />
              <Check size={16} class="cursor-pointer text-green-500" onClick={saveEdit} />
            </div>
          </Show>
        </div>
        <div class="break-words opacity-50">
          <Show when={!edit()}>
            <div innerHTML={showdownConverter.makeHtml(props.msg.msg)} />
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
