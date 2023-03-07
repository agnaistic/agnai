import { useNavigate, useParams } from '@solidjs/router'
import { Component, createEffect, createSignal, For, Show } from 'solid-js'
import { chatStore, guestStore, userStore } from '../../store'
import PageHeader from '../../shared/PageHeader'
import Button from '../../shared/Button'
import { Plus, Trash } from 'lucide-solid'
import CreateChatModal from './CreateChat'
import { toDuration } from '../../shared/util'
import { ConfirmModel } from '../../shared/Modal'
import { AppSchema } from '../../../srv/db/schema'

const CharacterChats: Component = () => {
  const { id } = useParams()
  const [showCreate, setCreate] = createSignal(false)

  const state = userStore().loggedIn
    ? chatStore((s) => ({ chats: s.char?.chats || [], char: s.char?.char }))
    : guestStore((s) => ({
        chats: s.chats.filter((ch) => ch.characterId === id),
        char: s.chars.find((c) => c._id === id),
      }))

  createEffect(() => {
    if (userStore().loggedIn) {
      chatStore.getBotChats(id)
    }
  })

  return (
    <div class="flex flex-col gap-2">
      <PageHeader title={`Chats with ${state.char?.name || '...'}`} />

      <div class="flex w-full justify-end gap-2">
        <Button onClick={() => setCreate(true)}>
          <Plus />
          Conversation
        </Button>
      </div>
      {state.chats.length === 0 && <NoChats />}
      <Show when={state.chats.length}>
        <Chats chats={state.chats} />
      </Show>
      <CreateChatModal show={showCreate()} onClose={() => setCreate(false)} char={state.char} />
    </div>
  )
}

const Chats: Component<{ chats: AppSchema.Chat[] }> = (props) => {
  const nav = useNavigate()
  const [showDelete, setDelete] = createSignal('')

  const confirmDelete = () => {
    if (userStore().loggedIn) {
      chatStore.deleteChat(showDelete(), () => setDelete(''))
    } else {
      guestStore.deleteChat(showDelete(), () => setDelete(''))
    }
  }

  return (
    <div class="flex flex-col gap-2">
      <div class="flex items-center">
        <div class="w-6/12 px-4 text-sm">Name</div>
        <div class="flex w-2/12 justify-center"></div>
        <div class="flex w-4/12 justify-start text-sm">Updated</div>
      </div>
      <For each={props.chats}>
        {(chat) => (
          <div class="flex w-full gap-2">
            <div
              class="flex h-12 w-full cursor-pointer flex-row items-center gap-2 rounded-xl bg-[var(--bg-900)]"
              onClick={() => nav(`/chat/${chat._id}`)}
            >
              <div class="w-6/12 px-4">{chat.name || 'Untitled'}</div>
              <div class="flex w-2/12 justify-center"></div>
              <div class="flex w-4/12 justify-between">
                <div class="text-sm">{toDuration(new Date(chat.updatedAt))} ago</div>
                <div class="mx-4 flex items-center gap-2"></div>
              </div>
            </div>
            <div class="flex items-center" onClick={() => setDelete(chat._id)}>
              <Trash size={16} class="icon-button" />
            </div>
          </div>
        )}
      </For>
      <ConfirmModel
        show={!!showDelete()}
        close={() => setDelete('')}
        confirm={confirmDelete}
        message="Are you sure wish to delete the conversation?"
      />
    </div>
  )
}

const NoChats: Component = () => (
  <div class="mt-4 flex w-full justify-center text-xl">
    There are no conversations saved for this character. Get started!
  </div>
)

export default CharacterChats
