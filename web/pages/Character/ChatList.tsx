import { A, useNavigate, useParams } from '@solidjs/router'
import { Component, createEffect, createMemo, createSignal, For, onMount, Show } from 'solid-js'
import { AllChat, characterStore, chatStore } from '../../store'
import PageHeader from '../../shared/PageHeader'
import { Edit, Import, Plus, SortAsc, SortDesc, Trash } from 'lucide-solid'
import CreateChatModal from './CreateChat'
import ImportChatModal from './ImportChat'
import { find, setComponentPageTitle, toDuration, toMap } from '../../shared/util'
import { ConfirmModal } from '../../shared/Modal'
import AvatarIcon from '../../shared/AvatarIcon'
import { AppSchema } from '../../../srv/db/schema'
import Select, { Option } from '../../shared/Select'
import Divider from '../../shared/Divider'
import TextInput from '../../shared/TextInput'
import Button from '../../shared/Button'
import CharacterSelect from '../../shared/CharacterSelect'

const CACHE_KEY = 'agnai-chatlist-cache'

type SortType =
  | 'chat-updated'
  | 'chat-created'
  | 'character-name'
  | 'character-created'
  | 'bot-activity'

type SortDirection = 'asc' | 'desc'

type ListCache = {
  sort: {
    field: SortType
    direction: SortDirection
  }
}

const sortOptions = [
  { value: 'chat-updated', label: 'Chat Activity', kind: 'chat' },
  { value: 'bot-activity', label: 'Bot Activity', kind: 'chat' },
  { value: 'chat-created', label: 'Chat Created', kind: 'chat' },
  { value: 'character-name', label: 'Bot Name', kind: 'bot' },
  { value: 'character-created', label: 'Bot Created', kind: 'bot' },
]

const CharacterChats: Component = () => {
  const params = useParams()
  const cache = getListCache()
  const chars = characterStore((s) => ({
    map: toMap(s.characters.list),
    list: s.characters.list,
    loaded: s.characters.loaded,
  }))

  const nav = useNavigate()
  const [search, setSearch] = createSignal('')
  const [char, setChar] = createSignal<AppSchema.Character | undefined>(
    params.id ? ({ _id: params.id, name: 'Loading' } as AppSchema.Character) : undefined
  )
  const [showCreate, setCreate] = createSignal(false)
  const [showImport, setImport] = createSignal(false)
  const [sortField, setSortField] = createSignal(cache.sort.field)
  const [sortDirection, setSortDirection] = createSignal(cache.sort.direction)

  createEffect(() => {
    if (!params.id) {
      setComponentPageTitle(`Chats`)
      return
    }

    const char = chars.map[params.id]
    setComponentPageTitle(char ? `${char.name} chats` : 'Chats')
    if (char) setChar(char)
  })

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
    if (!char()) return
    if (sortField() === 'character-name' || sortField() === 'character-created') {
      setSortField('chat-updated')
    }
  })

  const state = chatStore((s) => {
    const list = s.all?.chats || []

    return { list }
  })

  const chats = createMemo(() => {
    const id = char()?._id
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

          <CharacterSelect
            fieldName="char"
            items={chars.list}
            emptyLabel="All Characters"
            value={char()}
            onChange={setChar}
          />

          <div class="flex flex-wrap">
            <Select
              class="m-1 bg-[var(--bg-600)]"
              fieldName="sortBy"
              items={sortOptions.filter((opt) => (char() ? opt.kind === 'chat' : true))}
              value={sortField()}
              onChange={(next) => setSortField(next.value as SortType)}
            />

            <div class="py-1">
              <Button
                schema="secondary"
                class="rounded-xl"
                onClick={() => {
                  const next = sortDirection() === 'asc' ? 'desc' : 'asc'
                  setSortDirection(next as SortDirection)
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
          char={char()}
        />
      </Show>
      <CreateChatModal
        show={showCreate()}
        close={() => setCreate(false)}
        char={char()}
        id={params.id}
      />
      <ImportChatModal show={showImport()} close={() => setImport(false)} char={char()} />
    </div>
  )
}

const Chats: Component<{
  chats: AllChat[]
  chars: Record<string, AppSchema.Character>
  sortField: SortType
  sortDirection: SortDirection
  char?: AppSchema.Character
}> = (props) => {
  const [showDelete, setDelete] = createSignal('')

  const groups = createMemo(() => {
    let chars = Object.values(props.chars)
    if (props.char) {
      chars = [props.char]
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
                    <div class="flex items-center px-2" onClick={() => setDelete(chat._id)}>
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

function getChatSortableValue(chat: AppSchema.Chat, field: SortType) {
  switch (field) {
    case 'chat-updated':
      return chat.updatedAt
    case 'chat-created':
      return chat.createdAt
    default:
      return 0
  }
}

function getChatSortFunction(field: SortType, direction: SortDirection) {
  return (left: AppSchema.Chat, right: AppSchema.Chat) => {
    const mod = direction === 'asc' ? 1 : -1
    const l = getChatSortableValue(left, field)
    const r = getChatSortableValue(right, field)
    return l > r ? mod : l === r ? 0 : -mod
  }
}

function getCharacterSortableValue(char: AppSchema.Character, field: SortType) {
  switch (field) {
    case 'character-name':
      return char.name.toLowerCase()

    case 'character-created':
      return char.createdAt

    case 'bot-activity':
      return char.updatedAt

    default:
      return 0
  }
}

function getCharSortFunction(type: SortType, direction: SortDirection) {
  return (left: AppSchema.Character, right: AppSchema.Character) => {
    const mod = direction === 'asc' ? 1 : -1
    const l = getCharacterSortableValue(left, type)
    const r = getCharacterSortableValue(right, type)
    return l > r ? mod : l === r ? 0 : -mod
  }
}

function groupAndSort(
  allChars: AppSchema.Character[],
  allChats: AppSchema.Chat[],
  type: SortType,
  direction: SortDirection
): Array<ChatGroup> {
  if (type === 'chat-updated' || type == 'chat-created') {
    const sorted = allChats.slice().sort(getChatSortFunction(type, direction))
    return [{ char: null, chats: sorted }]
  }

  const groups: ChatGroup[] = []
  const sortedChats = allChats.slice().sort(getChatSortFunction('chat-updated', 'desc'))

  const chars = allChars.slice().map((char) => {
    if (type !== 'bot-activity') return char
    const first = find(sortedChats, 'characterId', char._id)
    return { ...char, updatedAt: first?.updatedAt || new Date(0).toISOString() }
  })

  chars.sort(getCharSortFunction(type, direction))

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
