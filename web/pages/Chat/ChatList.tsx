import { useNavigate } from '@solidjs/router'
import { RefreshCw } from 'lucide-solid'
import { Component, createEffect, For, Show } from 'solid-js'
import AvatarIcon from '../../shared/AvatarIcon'
import Button from '../../shared/Button'
import PageHeader from '../../shared/PageHeader'
import { toDuration } from '../../shared/util'
import { chatStore } from '../../store'

const ChatList: Component = () => {
  const state = chatStore()

  createEffect(() => {
    if (!state.all) {
      chatStore.getAllChats()
    }
  })

  return (
    <div class="flex flex-col gap-2">
      <PageHeader title="Conversations" />

      {!state.all?.chats.length && <NoChats />}
      <Show when={state.all}>
        <div
          class="focusable-icon-button flex cursor-pointer justify-end"
          onClick={chatStore.getAllChats}
        >
          <RefreshCw />
        </div>
        <Chats />
      </Show>
    </div>
  )
}

const Chats: Component = () => {
  const state = chatStore()
  const nav = useNavigate()

  return (
    <div class="flex flex-col gap-2">
      <For each={state.all?.chats}>
        {(chat) => (
          <div
            class="flex h-12 cursor-pointer flex-row items-center gap-2 rounded-xl bg-gray-900"
            onClick={() => nav(`/chat/${chat._id}`)}
          >
            <div class="flex w-6/12 items-center gap-4 px-4">
              <AvatarIcon avatarUrl={state.all?.chars[chat.characterId]?.avatar} />
              <b>{state.all?.chars[chat.characterId]?.name}</b>
              {chat.name || 'Untitled'}
            </div>
            <div class="flex w-2/12 justify-center"></div>
            <div class="flex w-4/12 justify-center">{toDuration(new Date(chat.updatedAt))} ago</div>
          </div>
        )}
      </For>
    </div>
  )
}

const NoChats: Component = () => (
  <div class="mt-4 flex w-full justify-center text-xl">
    There are no conversations saved for this character. Get started!
  </div>
)

export default ChatList
