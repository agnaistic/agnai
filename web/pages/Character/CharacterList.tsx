import {
  Component,
  Match,
  Show,
  Switch,
  createEffect,
  createMemo,
  createSignal,
  onMount,
} from 'solid-js'
import { NewCharacter, characterStore, chatStore, userStore } from '../../store'
import { tagStore } from '../../store'
import PageHeader from '../../shared/PageHeader'
import Select, { Option } from '../../shared/Select'
import TextInput from '../../shared/TextInput'
import { AppSchema } from '../../../common/types/schema'
import { Import, Plus, SortAsc, SortDesc, LayoutList, Image, RefreshCcw } from 'lucide-solid'
import { A, useSearchParams } from '@solidjs/router'
import ImportCharacterModal from '../Character/ImportCharacter'
import DeleteCharacterModal from '../Character/DeleteCharacter'
import { storage, setComponentPageTitle } from '../../shared/util'
import Button from '../../shared/Button'
import Loading from '../../shared/Loading'
import TagSelect from '../../shared/TagSelect'
import { DownloadModal } from './DownloadModal'
import { ListCharacter, SortDirection, ViewType, SortField } from './components/types'
import { CharacterListView } from './components/CharacterListView'
import { CharacterCardView } from './components/CharacterCardView'
import { CharacterFolderView } from './components/CharacterFolderView'
import Modal from '/web/shared/Modal'
import { CreateCharacterForm } from './CreateCharacterForm'
import { ManualPaginate, usePagination } from '/web/shared/Paginate'
import { Page } from '/web/Layout'
import { DragDropProvider, DragDropSensors } from '@thisbeyond/solid-dnd'
import { isMobile } from '/web/shared/hooks'

const CACHE_KEY = 'agnai-charlist-cache'

type ListCache = {
  view: ViewType
  sort: {
    field: SortField
    direction: SortDirection
  }
}

const sortOptions: Option<SortField>[] = [
  { value: 'modified', label: 'Last Modified' },
  { value: 'conversed', label: 'Last Conversed' },
  { value: 'created', label: 'Created' },
  { value: 'name', label: 'Name' },
]

const CharacterList: Component = () => {
  setComponentPageTitle('Characters')

  const cached = getListCache()
  const [query, setQuery] = useSearchParams()
  const [search, setSearch] = createSignal('')
  const [sortField, setSortField] = createSignal(cached.sort.field)
  const [sortDirection, setSortDirection] = createSignal(cached.sort.direction)

  const chats = chatStore((s) => s.allChats)
  const tags = tagStore((s) => ({ filter: s.filter, hidden: s.hidden }))
  const user = userStore()

  const state = chatStore((s) => {
    const allChars: ListCharacter[] = s.allChars.list
      .filter((ch) => ch.userId === user.user?._id)
      .map<ListCharacter>((ch) => ({ ...ch, chat: findLatestChat(ch._id, chats) }))

    return {
      allChars,
      list: allChars.filter((ch) => ch.userId === user.user?._id && !ch.favorite),

      loading: s.allLoading,
      loaded: s.loaded,
    }
  })

  onMount(() => {
    const state = chatStore.getState()

    if (!state.loaded && !state.allLoading) {
      chatStore.getAllChats()
    }
  })

  const favorites = createMemo(() => {
    const field = sortField()
    const dir = sortDirection()
    return state.allChars
      .filter((ch) => !!ch.favorite)
      .filter((ch) => ch.name.toLowerCase().includes(search().toLowerCase().trim()))
      .filter((ch) => tags.filter.length === 0 || ch.tags?.some((t) => tags.filter.includes(t)))
      .filter((ch) => !ch.tags || !ch.tags.some((t) => tags.hidden.includes(t)))
      .sort(getSortFunction(field, dir))
  })

  const sortedChars = createMemo(() => {
    const field = sortField()
    const dir = sortDirection()
    const sorted = state.list
      .slice()
      .filter((ch) => ch.userId === user.user?._id)
      .filter((ch) => ch.name.toLowerCase().includes(search().toLowerCase().trim()))
      .filter((ch) => tags.filter.length === 0 || ch.tags?.some((t) => tags.filter.includes(t)))
      .filter((ch) => !ch.tags || !ch.tags.some((t) => tags.hidden.includes(t)))
      .sort(getSortFunction(field, dir))
    return sorted
  })

  const [view, setView] = createSignal(cached.view || 'list')
  const [showImport, setImport] = createSignal(false)
  const [importPath, setImportPath] = createSignal<string | undefined>(query.import)
  const importQueue: NewCharacter[] = []

  const pager = usePagination({
    name: 'character-list',
    items: sortedChars,
    pageSize: 50,
  })

  const onImport = (chars: NewCharacter[]) => {
    importQueue.push(...chars)
    dequeue()
    setImport(false)
    setImportPath()
    setQuery({ import: undefined })
  }

  const dequeue = () => {
    const char = importQueue.shift()
    if (!char) return
    characterStore.createCharacter(char, dequeue)
  }

  const mobile = isMobile()

  const getNextView = (): ViewType => {
    const curr = view()
    if (!mobile) {
      return curr === 'list' ? 'cards' : curr === 'cards' ? 'folders' : 'list'
    }

    return curr === 'list' ? 'cards' : 'list'
  }

  createEffect(() => {
    if (!state.allChars.length) return
    tagStore.updateTags(state.allChars)
  })

  createEffect(() => {
    const next = {
      view: view(),
      sort: {
        field: sortField(),
        direction: sortDirection(),
      },
    }

    saveListCache(next)
  })

  return (
    <Page>
      <PageHeader
        title={
          <div class="flex w-full justify-between">
            <div>Characters</div>
            <div class="flex gap-2 text-base">
              <Button onClick={() => setImport(true)}>
                <Import />
                <span class="hidden sm:inline">Import</span>
              </Button>

              <A href="/character/create">
                <Button>
                  <Plus />
                  <span class="hidden sm:inline">Create</span>
                </Button>
              </A>

              <Button onClick={() => chatStore.getAllChats()}>
                <RefreshCcw />
              </Button>
            </div>
          </div>
        }
      />

      <div class="ma mb-2 flex justify-between">
        <div class="flex flex-wrap">
          <div class="m-1 ml-0 mr-1">
            <TextInput
              fieldName="search"
              placeholder="Search by name..."
              onChange={(ev) => setSearch(ev.currentTarget.value)}
            />
          </div>

          <div class="flex flex-wrap">
            <Select
              class="m-1 ml-0 bg-[var(--bg-600)]"
              fieldName="sortBy"
              items={sortOptions}
              value={sortField()}
              onChange={(next) => setSortField(next.value as SortField)}
            />

            <div class="mr-1 py-1">
              <Button
                schema="secondary"
                class="rounded-xl"
                onClick={() => {
                  const next = sortDirection() === 'asc' ? 'desc' : 'asc'
                  setSortDirection(next)
                }}
              >
                {sortDirection() === 'asc' ? <SortAsc /> : <SortDesc />}
              </Button>
            </div>
          </div>

          <TagSelect class="m-1" />
        </div>

        <div class="flex flex-wrap">
          <div class="py-1">
            <Button schema="secondary" onClick={() => setView(getNextView())}>
              <Switch>
                <Match when={getNextView() === 'list'}>
                  <span class="hidden sm:block">List View</span> <LayoutList />
                </Match>
                <Match when={getNextView() === 'cards'}>
                  <span class="hidden sm:block">Cards View</span> <Image />
                </Match>
                <Match when={getNextView() === 'folders'}>
                  <span class="hidden sm:block">Folder View</span> <Image />
                </Match>
              </Switch>
            </Button>
          </div>
        </div>
      </div>
      <div class="flex justify-center pb-2" classList={{ hidden: view() === 'folders' }}>
        <ManualPaginate pager={pager} />
      </div>
      <Characters
        allCharacters={sortedChars()}
        characters={pager.items()}
        loading={state.loading || false}
        loaded={!!state.loaded}
        type={view()}
        filter={search()}
        sortField={sortField()}
        sortDirection={sortDirection()}
        favorites={favorites()}
      />
      <div class="flex justify-center pb-5 pt-2" classList={{ hidden: view() === 'folders' }}>
        <ManualPaginate pager={pager} />
      </div>

      <ImportCharacterModal
        charhubPath={importPath()}
        show={showImport() || !!importPath()}
        close={() => setImport(false)}
        onSave={onImport}
      />
    </Page>
  )
}

const Characters: Component<{
  allCharacters: AppSchema.Character[]
  characters: AppSchema.Character[]
  favorites: AppSchema.Character[]
  loading: boolean
  loaded: boolean
  type: ViewType
  filter: string
  sortField: SortField
  sortDirection: SortDirection
}> = (props) => {
  const [editChar, setEditChar] = createSignal<AppSchema.Character>()
  const [showGrouping, setShowGrouping] = createSignal(false)
  const groups = createMemo(() => {
    const groups = [
      { label: 'Favorites', list: props.favorites },
      { label: '', list: props.characters },
    ]
    if (groups[0].list.length === 0) {
      setShowGrouping(false)
      return [groups[1]]
    }
    setShowGrouping(true)
    return groups
  })

  const toggleFavorite = (charId: string, favorite: boolean) => {
    characterStore.setFavorite(charId, favorite)
  }

  const [showDelete, setDelete] = createSignal<AppSchema.Character>()
  const [download, setDownload] = createSignal<AppSchema.Character>()
  return (
    <>
      <DragDropProvider>
        <DragDropSensors />
        <Switch fallback={<div>Failed to load characters. Refresh to try again.</div>}>
          <Match when={props.loading}>
            <div class="flex justify-center">
              <Loading />
            </div>
          </Match>
          <Match
            when={props.characters.length === 0 && props.favorites.length === 0 && props.loaded}
          >
            <NoCharacters />
          </Match>
          <Match when={props.loaded}>
            <Show when={!props.type || props.type === 'list'}>
              <CharacterListView
                groups={groups()}
                showGrouping={showGrouping()}
                toggleFavorite={toggleFavorite}
                setDownload={setDownload}
                setDelete={setDelete}
                setEdit={setEditChar}
              />
            </Show>

            <Show when={props.type === 'cards'}>
              <CharacterCardView
                groups={groups()}
                showGrouping={showGrouping()}
                toggleFavorite={toggleFavorite}
                setDelete={setDelete}
                setDownload={setDownload}
                setEdit={setEditChar}
              />
            </Show>

            <Show when={props.type === 'folders'}>
              <CharacterFolderView
                characters={props.allCharacters}
                favorites={props.favorites}
                groups={groups()}
                showGrouping={showGrouping()}
                toggleFavorite={toggleFavorite}
                setDelete={setDelete}
                setDownload={setDownload}
                setEdit={setEditChar}
              />
            </Show>
          </Match>
        </Switch>

        <Show when={download()}>
          <DownloadModal show close={() => setDownload()} charId={download()!._id} />
        </Show>
        <Show when={editChar()}>
          <EditCharacter char={editChar()} close={() => setEditChar()} />
        </Show>
        <DeleteCharacterModal
          char={showDelete()}
          show={!!showDelete()}
          close={() => setDelete(undefined)}
        />
      </DragDropProvider>
    </>
  )
}

const EditCharacter: Component<{ char?: AppSchema.Character; close: () => void }> = (props) => {
  const [footer, setFooter] = createSignal<any>()

  return (
    <Modal
      title={`Editing: ${props.char?.name}`}
      show
      close={props.close}
      maxWidth="half"
      footer={footer()}
    >
      <CreateCharacterForm
        editId={props.char?._id}
        close={props.close}
        noTitle
        footer={setFooter}
      />
    </Modal>
  )
}

function getSortableValue(char: ListCharacter, field: SortField) {
  switch (field) {
    case 'name':
      return char.name.toLowerCase()

    case 'created':
      return char.createdAt

    case 'modified':
      return char.updatedAt

    case 'conversed':
      return char.chat?.updatedAt || new Date(0).toISOString()

    default:
      return 0
  }
}

function getSortFunction(field: SortField, direction: SortDirection) {
  return (left: ListCharacter, right: ListCharacter) => {
    const mod = direction === 'asc' ? 1 : -1
    const l = getSortableValue(left, field)
    const r = getSortableValue(right, field)
    return l > r ? mod : l === r ? 0 : -mod
  }
}

function getListCache(): ListCache {
  const existing = storage.localGetItem(CACHE_KEY)
  const defaultCache: ListCache = { sort: { field: 'modified', direction: 'desc' }, view: 'list' }

  if (!existing) {
    return defaultCache
  }

  return { ...defaultCache, ...JSON.parse(existing) }
}

function saveListCache(cache: ListCache) {
  storage.localSetItem(CACHE_KEY, JSON.stringify(cache))
}

const NoCharacters: Component = () => (
  <div class="mt-16 flex w-full justify-center rounded-full text-xl">
    No characters found&nbsp;
    <A class="text-[var(--hl-500)]" href="/character/create">
      Create a character
    </A>
    &nbsp;to get started!
  </div>
)

export default CharacterList

function findLatestChat(charId: string, chats: AppSchema.Chat[]) {
  let match: AppSchema.Chat | undefined

  for (const chat of chats) {
    if (chat.characterId !== charId) continue
    if (!match) {
      match = chat
      continue
    }

    if (chat.updatedAt > match.updatedAt) {
      match = chat
    }
  }

  return match
}
