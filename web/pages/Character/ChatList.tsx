import { useNavigate, useParams } from '@solidjs/router'
import { Component, createEffect, createMemo, createSignal, For, onMount, Show } from 'solid-js'
import { AllChat, characterStore, chatStore } from '../../store'
import PageHeader from '../../shared/PageHeader'
import { Edit, Import, Menu, Plus, Trash } from 'lucide-solid'
import CreateChatModal from './CreateChat'
import ImportChatModal from './ImportChat'
import { toDuration, toEntityMap, toMap } from '../../shared/util'
import { ConfirmModal } from '../../shared/Modal'
import AvatarIcon from '../../shared/AvatarIcon'
import { DropMenu } from '../../shared/DropMenu'
import { AppSchema } from '../../../srv/db/schema'
import Select from '../../shared/Select'
import Divider from '../../shared/Divider'
import TextInput from '../../shared/TextInput'

const CACHE_KEY = 'agnai-chatlist-cache'

const CharacterChats: Component = () => {
  const params = useParams()
  const cache = getListCache()

  const nav = useNavigate()
  const [search, setSearch] = createSignal('')
  const [charId, setCharId] = createSignal(params.id || '')
  const [showCreate, setCreate] = createSignal(false)
  const [showImport, setImport] = createSignal(false)
  const [view, setView] = createSignal(cache.view)
  const [allview, setAllview] = createSignal(cache.all)

  const updateView = (next: { value: string }) => {
    const id = charId()
    if (!id) {
      setAllview(next.value)
      saveListCache({ all: next.value })
    } else {
      setView(next.value)
      saveListCache({ view: next.value })
    }
  }

  const state = chatStore((s) => {
    const list = s.all?.chats || []

    return { list }
  })

  const chars = characterStore((s) => ({
    map: toMap(s.characters.list),
    list: s.characters.list,
    loaded: s.characters.loaded,
  }))

  const chats = createMemo(() => {
    const id = charId()
    return state.list.filter((chat) => {
      const char = chars.map[chat.characterId]
      const trimmed = search().trim().toLowerCase()
      return (
        (chat.characterId === id || !id) &&
        (char?.name.toLowerCase().includes(trimmed) ||
          chat.name.toLowerCase().includes(trimmed) ||
          char?.description?.toLowerCase().includes(trimmed))
      )
    })
  })
  const charItems = createMemo(() => {
    return [{ label: 'All', value: '' }].concat(
      chars.list
        .slice()
        .sort((l, r) => (l.name > r.name ? 1 : l.name === r.name ? 0 : -1))
        .map((ch) => ({ label: ch.name, value: ch._id }))
    )
  })

  onMount(() => {
    if (!chars.loaded) {
      characterStore.getCharacters()
    }

    chatStore.getAllChats()
  })

  const Options = () => (
    <>
      <button
        class={`btn-primary w-full items-center justify-start py-2 sm:w-fit sm:justify-center`}
        onClick={() => setImport(true)}
      >
        <Import /> <span class="hidden sm:inline">Import</span>
      </button>
      <Show when={!!params.id}>
        <button
          class={`btn-primary w-full items-center justify-start py-2 sm:w-fit sm:justify-center`}
          onClick={() => nav(`/character/${params.id}/edit`)}
        >
          <Edit /> <span class="hidden sm:inline">Edit</span>
        </button>
      </Show>
      <button
        class={`btn-primary w-full items-center justify-start py-2 sm:w-fit sm:justify-center`}
        onClick={() => setCreate(true)}
      >
        <Plus /> <span class="hidden sm:inline">New</span>
      </button>
    </>
  )

  const viewTypes = createMemo(() => {
    const all = [
      { label: 'Chat activity - DESC', value: 'chat-desc' },
      { label: 'Chat activity - ASC', value: 'chat-asc' },
      { label: 'Bot name - ASC', value: 'name-asc' },
      { label: 'Bot name - DESC', value: 'name-desc' },
      { label: 'Bot age - ASC', value: 'age-desc' },
      { label: 'Bot age - DESC', value: 'age-desc' },
    ]

    if (charId()) return all.slice(0, 2)
    return all
  })

  return (
    <div class="flex flex-col gap-2">
      <PageHeader
        title={
          <div class="flex w-full justify-between">
            <div>Chats</div>
            <div class="flex gap-1 text-base">
              <Options />
            </div>
          </div>
        }
      />

      <div class="mx-auto flex h-full w-full flex-col justify-between sm:py-2">
        <div class="flex w-full items-center justify-between rounded-md">
          <div class="mb-2 flex w-full flex-wrap items-center">
            <div class="mr-1">
              <TextInput
                fieldName="search"
                class="max-w-[160px]"
                onKeyUp={(ev) => setSearch(ev.currentTarget.value)}
                placeholder="Search..."
              />
            </div>
            <Select
              fieldName="char"
              items={charItems()}
              value={charId()}
              onChange={(next) => setCharId(next.value)}
              class="my-1 mr-1 max-w-[160px]"
            />

            <Show when={charId()}>
              <Select
                fieldName="view"
                items={viewTypes()}
                onChange={updateView}
                value={view()}
                class="mx-1 my-1"
              />
            </Show>

            <Show when={!charId()}>
              <Select
                fieldName="allview"
                items={viewTypes()}
                onChange={updateView}
                value={allview()}
                class="my-1"
              />
            </Show>
          </div>
        </div>
      </div>

      {chats().length === 0 && <NoChats character={chars.map[params.id]?.name} />}
      <Show when={chats().length}>
        <Chats
          chats={chats()}
          chars={chars.map}
          view={charId() ? view() : allview()}
          charId={charId()}
        />
      </Show>
      <CreateChatModal
        show={showCreate()}
        close={() => setCreate(false)}
        char={chars.map[charId()]}
        id={params.id}
      />
      <ImportChatModal
        show={showImport()}
        close={() => setImport(false)}
        char={chars.map[charId()]}
      />
    </div>
  )
}

const Chats: Component<{
  chats: AllChat[]
  chars: Record<string, AppSchema.Character>
  view: string
  charId: string
}> = (props) => {
  const nav = useNavigate()
  const [showDelete, setDelete] = createSignal('')

  const groups = createMemo(() => {
    const chars = Object.values(props.chars)
    if (!props.charId) return groupAndSort(chars, props.chats, props.view)
    return groupAndSort(
      chars.filter((ch) => ch._id === props.charId),
      props.chats,
      props.view
    )
  })

  const confirmDelete = () => {
    chatStore.deleteChat(showDelete(), () => setDelete(''))
  }

  return (
    <div class="flex flex-col gap-2">
      <For each={groups()}>
        {({ char, chats }) => (
          <>
            <div class="flex flex-col gap-2">
              <Show when={char}>
                <div class="font-bold">{char!.name}</div>
              </Show>
              <Show when={chats.length === 0}>
                <div>No conversations</div>
              </Show>
              <For each={chats}>
                {(chat) => (
                  <div class="flex w-full justify-between gap-2 rounded-lg bg-[var(--bg-800)] p-1 hover:bg-[var(--bg-700)]">
                    <div
                      class="flex w-10/12 cursor-pointer gap-2 sm:w-11/12"
                      onClick={() => nav(`/chat/${chat._id}`)}
                    >
                      <div class="flex items-center justify-center">
                        <AvatarIcon
                          avatarUrl={props.chars[chat.characterId]?.avatar}
                          class="ml-2"
                        />
                      </div>

                      <div class="flex max-w-[90%] flex-col justify-center gap-0">
                        <Show when={!char}>
                          <div class="overflow-hidden text-ellipsis whitespace-nowrap font-bold leading-5">
                            {props.chars[chat.characterId]?.name}
                          </div>
                        </Show>
                        <div class="overflow-hidden text-ellipsis whitespace-nowrap text-sm leading-4">
                          {chat.name || 'Untitled'}
                        </div>
                        <div class="flex text-xs italic text-[var(--text-600)]">
                          Updated {toDuration(new Date(chat.updatedAt))} ago.
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center" onClick={() => setDelete(chat._id)}>
                      <Trash size={20} class="icon-button" />
                    </div>
                  </div>
                )}
              </For>
            </div>
            <Divider />
          </>
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
    <div>
      <Show when={!props.character}>You have no conversations yet.</Show>
      <Show when={props.character}>
        You have no conversations with <i>{props.character}</i>.
      </Show>
    </div>
  </div>
)

export default CharacterChats

type ChatGroup = { char: AppSchema.Character | null; chats: AppSchema.Chat[] }

function groupAndSort(
  allChars: AppSchema.Character[],
  allChats: AppSchema.Chat[],
  direction: string
): Array<ChatGroup> {
  const [kind, dir] = direction.split('-') as ['chat' | 'name' | 'age', 'asc' | 'desc']
  const mod = dir === 'asc' ? 1 : -1

  if (kind === 'chat') {
    const sorted = allChats
      .slice()
      .sort((l, r) => (l.updatedAt > r.updatedAt ? mod : l.updatedAt === r.updatedAt ? 0 : -mod))
    return [{ char: null, chats: sorted }]
  }

  const groups: ChatGroup[] = []
  const chars = allChars.slice().sort((left, right) => {
    const l = kind === 'age' ? left.createdAt : left.name
    const r = kind === 'age' ? right.createdAt : right.name
    return l > r ? mod : l === r ? 0 : -mod
  })

  for (const char of chars) {
    const chats = allChats.filter((ch) => ch.characterId === char._id)
    groups.push({ char, chats })
  }

  return groups
}

function getListCache(): { view: string; all: string } {
  const existing = localStorage.getItem(CACHE_KEY)

  if (!existing) {
    return { view: 'chat-desc', all: 'chat-desc' }
  }

  const parsed = JSON.parse(existing)
  return { view: 'chat-desc', all: 'chat-desc', ...parsed }
}

function saveListCache(cache: { view?: string; all?: string }) {
  const prev = getListCache()
  localStorage.setItem(CACHE_KEY, JSON.stringify({ ...prev, ...cache }))
}
