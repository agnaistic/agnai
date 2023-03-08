import { A, useNavigate } from '@solidjs/router'
import { RefreshCw } from 'lucide-solid'
import { Component, createEffect, For, Show } from 'solid-js'
import { AppSchema } from '../../../srv/db/schema'
import AvatarIcon from '../../shared/AvatarIcon'
import PageHeader from '../../shared/PageHeader'
import { toDuration } from '../../shared/util'
import { chatStore, userStore } from '../../store'

const ChatList: Component = () => {
  const state = chatStore()

  createEffect(() => {
    chatStore.getAllChats()
  })

  return (
    <div class="flex flex-col gap-2">
      <PageHeader title="Chats" />

      {!state.all?.chats.length && <NoChats />}
      <Show when={state.all}>
        <div class="icon-button flex cursor-pointer justify-end" onClick={chatStore.getAllChats}>
          <RefreshCw />
        </div>
        <Chats chats={state.all?.chats || []} chars={state.all?.chars || {}} />
      </Show>
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
