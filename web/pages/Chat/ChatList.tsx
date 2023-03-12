import { A, useNavigate } from '@solidjs/router'
import { RefreshCw } from 'lucide-solid'
import { Component, createEffect, For, Show, createSignal } from 'solid-js'
import { AppSchema } from '../../../srv/db/schema'
import AvatarIcon from '../../shared/AvatarIcon'
import PageHeader from '../../shared/PageHeader'
import { toDuration } from '../../shared/util'
import { chatStore, userStore } from '../../store'
import { Trash } from 'lucide-solid'
import DeleteChatModal from './components/DeleteChat'

const ChatList: Component = () => {
  const state = chatStore()
  const user = userStore()

  createEffect(() => {
    chatStore.getAllChats()
  })

  const [showDelete, setDelete] = createSignal<AppSchema.Chat>()

  return (
    <div class="flex flex-col gap-2">
      <PageHeader title="Chats" />

      {!state.all?.chats.length && <NoChats />}
      <Show when={state.all}>
        <div class="icon-button flex cursor-pointer justify-end" onClick={chatStore.getAllChats}>
          <RefreshCw />
        </div>
        <div class="flex w-full flex-col gap-2">
          <For each={state.all?.chats}>
            {(chat) => (
              <Chat
                chat={chat}
                char={state.all?.chars[chat.characterId]}
                delete={() => setDelete(chat)}
                owner={chat.userId === user.user?._id}
              />
            )}
          </For>
        </div>
      </Show>
      <DeleteChatModal
        chat={showDelete()}
        show={!!showDelete()}
        close={() => setDelete(undefined)}
      />
    </div>
  )
}

const Chat: Component<{
  chat: AppSchema.Chat
  char?: AppSchema.Character
  owner: boolean
  delete: () => void
}> = (props) => {
  return (
    <div class="flex w-full gap-2">
      <div class="flex h-12 w-full flex-row items-center gap-4 rounded-xl bg-[var(--bg-800)]">
        <A
          class="ml-4 flex h-3/4 cursor-pointer items-center rounded-2xl  sm:w-9/12"
          href={`/chat/${props.chat._id}`}
        >
          <AvatarIcon avatarUrl={props.char?.avatar} size="10" class="mx-4" />
          <div class="text-lg font-bold">{props.chat.name || 'Untitled'}</div>
        </A>
      </div>
      <div class="flex flex-row items-center justify-center gap-2 sm:w-3/12">
        <Show when={props.owner}>
          <Trash class="cursor-pointer text-white/25 hover:text-white" onClick={props.delete} />
        </Show>
      </div>
    </div>
  )
}

const Chats: Component<{ chats: AppSchema.Chat[]; chars: Record<string, AppSchema.Character> }> = (
  props
) => {
  const users = userStore()
  const nav = useNavigate()

  return (
    <div class="flex flex-col gap-2">
      <For each={props.chats}>
        {(chat) => {
          const owner =
            chat.userId === users.user?._id ? `border-[var(--bg-700)]` : 'border-[var(--bg-900)]'

          return (
            <div
              class={
                'flex h-12 cursor-pointer flex-row items-center gap-2 rounded-xl border-2 bg-[var(--bg-900)] ' +
                owner
              }
              onClick={() => nav(`/chat/${chat._id}`)}
            >
              <div class="flex w-6/12 items-center gap-4 px-4">
                <AvatarIcon avatarUrl={props.chars[chat.characterId]?.avatar} />
                <b>{props.chars[chat.characterId]?.name}</b>
                {chat.name || 'Untitled'}
              </div>
              <div class="flex w-2/12 justify-center"></div>
              <div class="flex w-4/12 justify-center">
                {toDuration(new Date(chat.updatedAt))} ago
              </div>
            </div>
          )
        }}
      </For>
    </div>
  )
}

const NoChats: Component = () => (
  <div class="mt-4 flex w-full flex-col items-center text-xl">
    There are no conversations saved for this character.{' '}
    <div>
      <A href="/character/list" class="link">
        Get started!
      </A>
    </div>
  </div>
)

export default ChatList

function toCharacterMap(chars: AppSchema.Character[]) {
  return chars.reduce<Record<string, AppSchema.Character>>(
    (prev, curr) => Object.assign(prev, { [curr._id]: curr }),
    {}
  )
}
