import { A, useNavigate, useParams } from '@solidjs/router'
import { Component, createEffect, createMemo, createSignal, For, onMount, Show } from 'solid-js'
import { AllChat, characterStore, chatStore } from '../../store'
import PageHeader from '../../shared/PageHeader'
import { Edit, Import, Plus, SortAsc, SortDesc, Trash } from 'lucide-solid'
import CreateChatModal from './CreateChat'
import ImportChatModal from './ImportChat'
import { setComponentPageTitle, toDuration, toMap } from '../../shared/util'
import { ConfirmModal } from '../../shared/Modal'
import AvatarIcon from '../../shared/AvatarIcon'
import { AppSchema } from '../../../srv/db/schema'
import Select, { Option } from '../../shared/Select'
import Divider from '../../shared/Divider'
import TextInput from '../../shared/TextInput'
import Button from '../../shared/Button'

const CACHE_KEY = 'agnai-chatlist-cache'

type SortFieldTypes = 'chat-updated' | 'chat-created' | 'character-name' | 'character-created'
type SortDirectionTypes = 'asc' | 'desc'

type ListCache = {
  sort: {
    field: SortFieldTypes
    direction: SortDirectionTypes
  }
}

const chatSortOptions: Option<SortFieldTypes>[] = [
  { value: 'chat-updated', label: 'Chat Activity' },
  { value: 'chat-created', label: 'Chat Created' },
]

const chatAndCharSortOptions: Option<SortFieldTypes>[] = [
  ...chatSortOptions,
  { value: 'character-name', label: 'Character Name' },
  { value: 'character-created', label: 'Character Created' },
]

const CharacterChats: Component = () => {
  const params = useParams()
  const cache = getListCache()
  const chars = characterStore((s) => ({
    map: toMap(s.characters.list),
    list: s.characters.list,
    loaded: s.characters.loaded,
  }))
  const charName = chars.map[params.id]?.name
  setComponentPageTitle(charName ? `${charName} chat list` : 'Chat list')

  const nav = useNavigate()
  const [search, setSearch] = createSignal('')
  const [charId, setCharId] = createSignal(params.id || '')
  const [showCreate, setCreate] = createSignal(false)
  const [showImport, setImport] = createSignal(false)
  const [sortField, setSortField] = createSignal(cache.sort.field)
  const [sortDirection, setSortDirection] = createSignal(cache.sort.direction)
  const [sortOptions, setSortOptions] = createSignal(chatAndCharSortOptions)

  createEffect(() => {
    const next = {
      sort: {
        field: sortField(),
        direction: sortDirection(),
      },
    }

    saveListCache(next)
  })

  createEffect(() => {
    if (!charId()) return
    if (sortField() == 'character-name' || sortField() == 'character-created') {
      setSortField('chat-updated')
    }
  })

  createEffect(() => {
    if (charId() && sortOptions() == chatAndCharSortOptions) {
      setSortOptions(chatSortOptions)
    } else if (!charId() && sortOptions() == chatSortOptions) {
      setSortOptions(chatAndCharSortOptions)
    }
  })

  const state = chatStore((s) => {
    const list = s.all?.chats || []

    return { list }
  })

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

      <div class="mb-2 flex justify-between">
        <div class="flex flex-wrap">
          <div class="m-1 ml-0">
            <TextInput
              fieldName="search"
              placeholder="Search..."
              onKeyUp={(ev) => setSearch(ev.currentTarget.value)}
            />
          </div>

          <Select
            fieldName="char"
            items={charItems()}
            value={charId()}
            onChange={(next) => setCharId(next.value)}
            class="m-1 max-w-[160px] bg-[var(--bg-600)]"
          />

          <div class="flex flex-wrap">
            <Select
              class="m-1 bg-[var(--bg-600)]"
              fieldName="sortBy"
              items={sortOptions()}
              value={sortField()}
              onChange={(next) => setSortField(next.value as SortFieldTypes)}
            />

            <div class="py-1">
              <Button
                schema="secondary"
                class="rounded-xl"
                onClick={() => {
                  const next = sortDirection() === 'asc' ? 'desc' : 'asc'
                  setSortDirection(next as SortDirectionTypes)
                }}
              >
                {sortDirection() === 'asc' ? <SortAsc /> : <SortDesc />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {chats().length === 0 && <NoChats character={chars.map[params.id]?.name} />}
      <Show when={chats().length}>
        <Chats
          chats={chats()}
          chars={chars.map}
          sortField={sortField()}
          sortDirection={sortDirection()}
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
  sortField: SortFieldTypes
  sortDirection: SortDirectionTypes
  charId: string
}> = (props) => {
  const nav = useNavigate()
  const [showDelete, setDelete] = createSignal('')

  const groups = createMemo(() => {
    let chars = Object.values(props.chars)
    if (props.charId) {
      chars = chars.filter((ch) => ch._id === props.charId)
    }
    return groupAndSort(chars, props.chats, props.sortField, props.sortDirection)
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
                    <A
                      class="flex w-10/12 cursor-pointer gap-2 sm:w-11/12"
                      href={`/chat/${chat._id}`}
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
                    </A>
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

function getChatSortableValue(chat: AppSchema.Chat, field: SortFieldTypes) {
  switch (field) {
    case 'chat-updated':
      return chat.updatedAt
    case 'chat-created':
      return chat.createdAt
    default:
      return 0
  }
}

function getChatSortFunction(field: SortFieldTypes, direction: SortDirectionTypes) {
  return (left: AppSchema.Chat, right: AppSchema.Chat) => {
    const mod = direction === 'asc' ? 1 : -1
    const l = getChatSortableValue(left, field)
    const r = getChatSortableValue(right, field)
    return l > r ? mod : l === r ? 0 : -mod
  }
}

function getCharacterSortableValue(char: AppSchema.Character, field: SortFieldTypes) {
  switch (field) {
    case 'character-name':
      return char.name.toLowerCase()
    case 'character-created':
      return char.createdAt
    default:
      return 0
  }
}

function getCharSortFunction(field: SortFieldTypes, direction: SortDirectionTypes) {
  return (left: AppSchema.Character, right: AppSchema.Character) => {
    const mod = direction === 'asc' ? 1 : -1
    const l = getCharacterSortableValue(left, field)
    const r = getCharacterSortableValue(right, field)
    return l > r ? mod : l === r ? 0 : -mod
  }
}

function groupAndSort(
  allChars: AppSchema.Character[],
  allChats: AppSchema.Chat[],
  sortField: SortFieldTypes,
  sortDirection: SortDirectionTypes
): Array<ChatGroup> {
  const mod = sortDirection === 'asc' ? 1 : -1

  if (sortField === 'chat-updated' || sortField == 'chat-created') {
    const sorted = allChats.slice().sort(getChatSortFunction(sortField, sortDirection))
    return [{ char: null, chats: sorted }]
  }

  const groups: ChatGroup[] = []
  const chars = allChars.slice().sort(getCharSortFunction(sortField, sortDirection))

  for (const char of chars) {
    const chats = allChats
      .filter((ch) => ch.characterId === char._id)
      .sort(getChatSortFunction('chat-updated', 'desc'))
    groups.push({ char, chats })
  }

  return groups
}

function getListCache(): ListCache {
  const existing = localStorage.getItem(CACHE_KEY)
  const defaultCache: ListCache = { sort: { field: 'chat-updated', direction: 'desc' } }

  if (!existing) {
    return defaultCache
  }

  return { ...defaultCache, ...JSON.parse(existing) }
}

function saveListCache(cache: ListCache) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
}
