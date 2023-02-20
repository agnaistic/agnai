import { useParams } from '@solidjs/router'
import { Component, createEffect, createSignal, For } from 'solid-js'
import { AppSchema } from '../../../server/db/schema'
import { chatStore } from '../../store'
import PageHeader from '../../shared/PageHeader'
import AvatarIcon from '../../shared/AvatarIcon'
import Button from '../../shared/Button'
import { Plus } from 'lucide-solid'
import CreateChatModal from './CreateChat'

const CharacterChatList: Component = () => {
  const [modal, setModal] = createSignal(false)
  const [char, setChar] = createSignal<AppSchema.Character>()
  const state = chatStore()
  const { id } = useParams()

  createEffect(() => {
    if (state.chats?.character._id !== id) {
      chatStore.getChats(id)
    } else {
      setChar(state.chats.character)
    }
  })

  return (
    <div>
      <PageHeader
        title="Conversations"
        subtitle={<span class="flex flex-row items-center">Chats with {char()?.name}</span>}
      />

      <div class="flex w-full justify-end">
        <Button onClick={() => setModal(true)}>
          <Plus />
          Conversation
        </Button>
      </div>
      {state.chats?.list.length === 0 && <NoChats />}
      <Chats />
      <CreateChatModal show={modal()} onClose={() => setModal(false)} />
    </div>
  )
}

const Chats: Component = () => {
  const state = chatStore()

  return (
    <div>
      <For each={state.chats?.list || []}>
        {(chat) => (
          <div>
            <div>{chat.name}</div>
            <div>{chat.updatedAt}</div>
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

export default CharacterChatList
