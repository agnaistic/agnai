import { useNavigate, useParams } from '@solidjs/router'
import { Component, createEffect, createSignal, For, Show } from 'solid-js'
import { characterStore, chatStore, msgStore, NewChat, NewMsgImport, toastStore } from '../../store'
import PageHeader from '../../shared/PageHeader'
import Button from '../../shared/Button'
import { Import, Plus, Trash } from 'lucide-solid'
import CreateChatModal from './CreateChat'
import ImportChatModal from './ImportChat'
import { toDuration, toEntityMap } from '../../shared/util'
import { ConfirmModal } from '../../shared/Modal'
import { AppSchema } from '../../../srv/db/schema'
import AvatarIcon from '../../shared/AvatarIcon'

const CharacterChats: Component = () => {
  const { id } = useParams()
  const [showCreate, setCreate] = createSignal(false)
  const [showImport, setImport] = createSignal(false)

  const state = chatStore((s) => {
    if (id) {
      return { chats: s.char?.chats || [], char: s.char?.char }
    }

    return { chats: s.all?.chats || [], char: undefined }
  })

  createEffect(() => {
    if (id) {
      chatStore.getBotChats(id)
    } else {
      chatStore.getAllChats()
    }
  })

  return (
    <div class="flex flex-col gap-2">
      <Show when={!!id} fallback={<PageHeader title="Chats" />}>
        <PageHeader title={`Chats with ${state.char?.name || '...'}`} />
      </Show>

      <div class="flex w-full justify-end gap-2">
        <Button onClick={() => setImport(true)}>
          <Import />
          Import
        </Button>
        <Button onClick={() => setCreate(true)}>
          <Plus />
          Chat
        </Button>
      </div>
      {state.chats.length === 0 && <NoChats />}
      <Show when={state.chats.length}>
        <Chats chats={state.chats} />
      </Show>
      <CreateChatModal
        show={showCreate()}
        close={() => setCreate(false)}
        char={state.char}
        id={id}
      />
      <ImportChatModal show={showImport()} close={() => setImport(false)} char={state.char} />
    </div>
  )
}

const Chats: Component<{ chats: AppSchema.Chat[] }> = (props) => {
  const chars = characterStore((s) => ({
    list: s.characters.list || [],
    map: toEntityMap(s.characters.list),
  }))

  const nav = useNavigate()
  const [showDelete, setDelete] = createSignal('')

  const confirmDelete = () => {
    chatStore.deleteChat(showDelete(), () => setDelete(''))
  }

  return (
    <div class="flex flex-col gap-2">
      <For each={props.chats}>
        {(chat) => (
          <div class="flex w-full gap-2">
            <div
              class="flex h-12 w-full cursor-pointer flex-row items-center gap-2 rounded-xl bg-[var(--bg-800)] hover:bg-[var(--bg-700)]"
              onClick={() => nav(`/chat/${chat._id}`)}
            >
              <div class="flex w-1/2 items-center gap-2 sm:w-5/12">
                <AvatarIcon avatarUrl={chars.map[chat.characterId]?.avatar} class="ml-2" />
                {chars.map[chat.characterId]?.name}
              </div>
              <div class="w-5/12 px-4">{chat.name || 'Untitled'}</div>
              <div class="hidden w-1/2  justify-between sm:flex sm:w-2/12">
                <div class="text-sm">{toDuration(new Date(chat.updatedAt))} ago</div>
              </div>
            </div>
            <div class="flex items-center" onClick={() => setDelete(chat._id)}>
              <Trash size={16} class="icon-button" />
            </div>
          </div>
        )}
      </For>
      <ConfirmModal
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
