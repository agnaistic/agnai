import { A, useNavigate, useParams } from '@solidjs/router'
import { Component, createEffect, createMemo, createSignal, For, Show } from 'solid-js'
import { AllChat, characterStore, chatStore } from '../../store'
import PageHeader from '../../shared/PageHeader'
import Button from '../../shared/Button'
import { ChevronLeft, Edit, Import, Menu, Plus, Trash } from 'lucide-solid'
import CreateChatModal from './CreateChat'
import ImportChatModal from './ImportChat'
import { toDuration, toEntityMap } from '../../shared/util'
import { ConfirmModal } from '../../shared/Modal'
import AvatarIcon from '../../shared/AvatarIcon'
import { DropMenu } from '../../shared/DropMenu'

const CharacterChats: Component = () => {
  const params = useParams()
  const nav = useNavigate()
  const [showCreate, setCreate] = createSignal(false)
  const [showImport, setImport] = createSignal(false)
  const [opts, setOpts] = createSignal(false)

  const state = chatStore((s) => {
    if (params.id) {
      return { chats: s.char?.chats || [], char: s.char?.char }
    }

    return { chats: s.all?.chats || [], char: undefined }
  })

  createEffect(() => {
    if (params.id) {
      chatStore.getBotChats(params.id)
    } else {
      chatStore.getAllChats()
    }
  })

  const wrap = (fn: Function) => () => {
    fn()
    setOpts(false)
  }

  const Options = () => (
    <>
      <button
        class={`btn-primary w-full items-center justify-start py-2 sm:w-fit sm:justify-center`}
        onClick={wrap(() => setImport(true))}
      >
        <Import />
        Import
      </button>
      <Show when={!!params.id}>
        <button
          class={`btn-primary w-full items-center justify-start py-2 sm:w-fit sm:justify-center`}
          onClick={wrap(() => nav(`/character/${params.id}/edit`))}
        >
          <Edit />
          Edit Character
        </button>
      </Show>
      <button
        class={`btn-primary w-full items-center justify-start py-2 sm:w-fit sm:justify-center`}
        onClick={wrap(() => setCreate(true))}
      >
        <Plus />
        Chat
      </button>
    </>
  )

  return (
    <div class="flex flex-col gap-2">
      <PageHeader title={'Chats'} />

      <div class="mx-auto flex h-full w-full flex-col justify-between sm:py-2">
        <div class="flex h-8 items-center justify-between rounded-md">
          <div class="flex cursor-pointer flex-row items-center justify-between gap-4 text-lg font-bold">
            <A href={`/character/list`} class="flex items-center gap-2">
              <ChevronLeft />
              <Show when={!!params.id} fallback={<span>All Chats</span>}>
                <span>Chats with {state.char?.name || '...'}</span>
              </Show>
            </A>
          </div>

          <div class="hidden gap-3 sm:flex">
            <Options />
          </div>

          <div class="sm:hidden" onClick={() => setOpts(true)}>
            <Menu class="icon-button" />
            <Show when={opts()}>
              <DropMenu show={true} close={() => setOpts(false)} horz="left">
                <div class="flex w-60 flex-col gap-2 p-2">
                  <Options />
                </div>
              </DropMenu>
            </Show>
          </div>
        </div>
      </div>

      {state.chats.length === 0 && <NoChats character={state.char?.name} />}
      <Show when={state.chats.length}>
        <Chats chats={state.chats} />
      </Show>
      <CreateChatModal
        show={showCreate()}
        close={() => setCreate(false)}
        char={state.char}
        id={params.id}
      />
      <ImportChatModal show={showImport()} close={() => setImport(false)} char={state.char} />
    </div>
  )
}

const Chats: Component<{ chats: AllChat[] }> = (props) => {
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
                {chat.character?.name || chars.map[chat.characterId]?.name}
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

const NoChats: Component<{ character?: string }> = (props) => (
  <div class="mt-4 flex w-full justify-center text-xl">
    <Show when={!props.character}>You have no conversations yet.</Show>
    <Show when={props.character}>
      You have no conversations with <i>{props.character}</i>.
    </Show>
  </div>
)

export default CharacterChats
