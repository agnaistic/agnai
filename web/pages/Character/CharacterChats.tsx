import { useNavigate, useParams } from '@solidjs/router'
import { Component, createEffect, createSignal, For, Show } from 'solid-js'
import { chatStore } from '../../store'
import PageHeader from '../../shared/PageHeader'
import Button from '../../shared/Button'
import { Plus } from 'lucide-solid'
import CreateChatModal from './CreateChat'
import { toDuration } from '../../shared/util'

const CharacterChats: Component = () => {
  const [showCreate, setCreate] = createSignal(false)
  const state = chatStore((s) => ({ char: { ...s.character }, chats: s.list || [] }))
  const { id } = useParams()

  createEffect(() => {
    chatStore.getChats(id)
  })

  return (
    <div class="flex flex-col gap-2">
      <PageHeader
        title="Conversations"
        subtitle={
          <span class="flex flex-row items-center">Chats with {state.char.name || '...'}</span>
        }
      />

      <div class="flex w-full justify-end gap-2">
        <Button onClick={() => setCreate(true)}>
          <Plus />
          Conversation
        </Button>
      </div>
      {state.chats.length === 0 && <NoChats />}
      <Show when={state.chats.length}>
        <Chats />
      </Show>
      <CreateChatModal show={showCreate()} onClose={() => setCreate(false)} />
    </div>
  )
}

const Chats: Component = () => {
  const state = chatStore()
  const nav = useNavigate()

  return (
    <div class="flex flex-col gap-2">
      <div class="flex items-center">
        <div class="w-6/12 px-4">Name</div>
        <div class="flex w-2/12 justify-center"></div>
        <div class="flex w-4/12 justify-center">Updated</div>
      </div>
      <For each={state.list}>
        {(chat) => (
          <div
            class="flex h-12 cursor-pointer flex-row items-center gap-2 rounded-xl bg-gray-800"
            onClick={() => nav(`/chat/${chat._id}`)}
          >
            <div class="w-6/12 px-4">{chat.name || 'Untitled'}</div>
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

export default CharacterChats
