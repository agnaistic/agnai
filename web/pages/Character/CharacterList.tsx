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
import {
  NewCharacter,
  characterStore,
  chatStore,
  downloadCharacters,
  pageStore,
  userStore,
} from '../../store'
import { tagStore } from '../../store'
import PageHeader from '../../shared/PageHeader'
import Select, { Option } from '../../shared/Select'
import TextInput from '../../shared/TextInput'
import { AppSchema } from '../../../common/types/schema'
import { Import, Plus, SortAsc, SortDesc, LayoutList, Image, RefreshCcw } from 'lucide-solid'
import { A, useNavigate, useSearchParams } from '@solidjs/router'
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
import { createStore } from 'solid-js/store'

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
  const nav = useNavigate()
  const [selected, setSelected] = createStore<Record<string, boolean>>({})

  const [search, setSearch] = createSignal('')
  const [sortField, setSortField] = createSignal(cached.sort.field)
  const [sortDirection, setSortDirection] = createSignal(cached.sort.direction)
  const [multi, setMulti] = createSignal(false)

  const tags = tagStore((s) => ({ filter: s.filter, hidden: s.hidden }))
  const user = userStore((s) => ({ user: s.user }))

  const chats = chatStore((s) => {
    return {
      list: s.allChats,
      map: s.allChats.reduce<Record<string, AppSchema.Chat>>(toCharacterChatMap, {}),
    }
  })

  const chars = characterStore((s) => ({
    loading: s.loading,
    loaded: s.characters.loaded > 0,
    list: s.characters.list,
    map: s.characters.map,
  }))

  onMount(() => {
    if (!chars.loaded && !chars.loading) {
      characterStore.getAllChats()
    }
  })

  const favorites = createMemo(() => {
    const field = sortField()
    const dir = sortDirection()
    return chars.list
      .filter((ch) => ch.userId === user.user?._id)
      .filter((ch) => !!ch.favorite)
      .filter((ch) => ch.name.toLowerCase().includes(search().toLowerCase().trim()))
      .filter((ch) => tags.filter.length === 0 || ch.tags?.some((t) => tags.filter.includes(t)))
      .filter((ch) => !ch.tags || !ch.tags.some((t) => tags.hidden.includes(t)))
      .map((ch) => ({ ...ch, chat: chats.map[ch._id] }))
      .sort(getSortFunction(field, dir))
  })

  const sortedChars = createMemo(() => {
    const field = sortField()
    const dir = sortDirection()

    const selectingIds = new Set<string>()
    const isSelecting = multi()

    for (const [key, enabled] of Object.entries(selected)) {
      if (!isSelecting) continue
      if (enabled) {
        selectingIds.add(key)
      }
    }

    const sorted = chars.list
      .slice()
      .filter((ch) => ch.userId === user.user?._id && !ch.favorite)
      .filter((ch) => ch.name.toLowerCase().includes(search().toLowerCase().trim()))
      .filter((ch) => tags.filter.length === 0 || ch.tags?.some((t) => tags.filter.includes(t)))
      .filter((ch) => !ch.tags || !ch.tags.some((t) => tags.hidden.includes(t)))
      .map((ch) => ({ ...ch, chat: chats.map[ch._id] }))
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
    if (!chars.list.length) return
    tagStore.updateTags(chars.list)
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

  const multiSelected = createMemo(() => {
    const ids = Object.entries(selected)
      .filter(([_, active]) => active === true)
      .map(([key]) => key)

    return { ids, count: ids.length }
  })

  const cancelSelect = () => {
    const { ids } = multiSelected()
    for (const id of ids) {
      setSelected(id, false)
    }

    setMulti(false)
  }

  const downloadSelected = async () => {
    const selected = multiSelected()

    if (selected.count) {
      await downloadCharacters(selected.ids)
    }
  }

  const archiveSelected = async () => {
    const selected = multiSelected()

    if (selected.count) {
      pageStore.openConfirm({
        message: `Archive ${selected.count} characters?`,
        onConfirm: () => characterStore.editMany(selected.ids, { type: 'archive' }),
      })
    }
  }

  const canUnarchive = createMemo(() => {
    const allowed = multiSelected().ids.some((id) => {
      const char = chars.map[id]
      if (!char?.tags) return false
      if (char.tags.includes('archived')) return true
      return false
    })
    return allowed
  })

  const canArchive = createMemo(() => {
    const allowed = multiSelected().ids.some((id) => {
      const char = chars.map[id]
      if (!char?.tags) return true
      if (!char.tags.includes('archived')) return true
      return false
    })
    return allowed
  })

  const unarchiveSelected = async () => {
    const selected = multiSelected()

    if (selected.count) {
      pageStore.openConfirm({
        message: `Unarchive ${selected.count} characters?`,
        onConfirm: () =>
          characterStore.editMany(selected.ids, { type: 'remove-tag', value: 'archived' }),
      })
    }
  }

  const deleteSelected = async () => {
    const selected = multiSelected()

    if (selected.count) {
      pageStore.openConfirm({
        message: `Are you sure you wish to delete ${selected.count} characters?`,
        onConfirm: () => characterStore.editMany(selected.ids, { type: 'delete' }),
      })
    }
  }

  return (
    <Page>
      <PageHeader
        title={'Characters'}
        subtitle={
          <div class="flex flex-col gap-2">
            <div class="flex gap-2 text-base">
              <Button size="sm" onClick={() => setImport(true)}>
                <Import />
                <span class="hidden sm:inline">Import</span>
              </Button>

              <Button size="sm" onClick={() => nav('/character/create')}>
                <Plus />
                <span class="hidden sm:inline">Create</span>
              </Button>

              <Button size="sm" class="!h-[32px]" onClick={() => setMulti(true)}>
                Select
              </Button>

              <Button onClick={() => characterStore.getAllChats()} size="sm">
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

      <Show when={multi()}>
        <div class="py-1">
          <div class="text-500 text-xs font-bold">
            <Show when={multiSelected().count > 0} fallback={'Selected: None'}>
              Selected: {multiSelected().count}
            </Show>
          </div>
          <div class="flex flex-wrap items-center gap-2 text-base">
            <Button
              size="sm"
              schema="error"
              disabled={multiSelected().count === 0}
              onClick={deleteSelected}
            >
              Delete
            </Button>
            <Button
              size="sm"
              disabled={multiSelected().count === 0 || !canArchive()}
              onClick={archiveSelected}
            >
              Archive
            </Button>

            <Button
              size="sm"
              disabled={multiSelected().count === 0 || !canUnarchive()}
              onClick={unarchiveSelected}
            >
              Unarchive
            </Button>

            {/* @todo: need to get detailed char info for downloading before zipping */}
            <Button size="sm" disabled={multiSelected().count === 0} onClick={downloadSelected}>
              Download
            </Button>
            <Button size="sm" schema="secondary" onClick={cancelSelect}>
              Done
            </Button>
          </div>
        </div>
      </Show>

      <div class="flex justify-center pb-2" classList={{ hidden: view() === 'folders' }}>
        <ManualPaginate pager={pager} />
      </div>
      <Characters
        allCharacters={sortedChars()}
        characters={pager.items()}
        loading={chars.loading || false}
        loaded={!!chars.loaded}
        type={view()}
        filter={search()}
        sortField={sortField()}
        sortDirection={sortDirection()}
        favorites={favorites()}
        multiselect={multi()}
        selected={selected}
        setSelected={setSelected}
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
  multiselect: boolean
  characters: AppSchema.Character[]
  favorites: AppSchema.Character[]
  loading: boolean
  loaded: boolean
  type: ViewType
  filter: string
  sortField: SortField
  sortDirection: SortDirection

  selected: Record<string, boolean>
  setSelected: (charId: string, state: boolean) => void
}> = (props) => {
  const [showDelete, setDelete] = createSignal<AppSchema.Character>()
  const [download, setDownload] = createSignal<AppSchema.Character>()
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

  const selectCharacter = (id: string) => {
    const prev = !!props.selected[id]
    props.setSelected(id, !prev)
  }

  return (
    <>
      <DragDropProvider>
        <DragDropSensors />
        <Switch fallback={<div>Failed to load characters. Refresh to try again.</div>}>
          <Match when={props.loading && props.allCharacters.length === 0}>
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
                selecting={props.multiselect}
                select={selectCharacter}
                selected={props.selected}
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
                selecting={props.multiselect}
                select={selectCharacter}
                selected={props.selected}
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
                selecting={props.multiselect}
                select={selectCharacter}
                selected={props.selected}
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

// function findLatestChat(charId: string, chats: AppSchema.Chat[]) {
//   let match: AppSchema.Chat | undefined

//   for (const chat of chats) {
//     if (chat.characterId !== charId) continue
//     if (!match) {
//       match = chat
//       continue
//     }

//     if (chat.updatedAt > match.updatedAt) {
//       match = chat
//     }
//   }

//   return match
// }

function toCharacterChatMap(prev: Record<string, AppSchema.Chat>, curr: AppSchema.Chat) {
  const exist = prev[curr.characterId]
  if (!exist) {
    prev[curr.characterId] = { ...curr }
    return prev
  }

  const next = exist.updatedAt > curr.updatedAt ? exist : { ...curr }
  prev[curr.characterId] = next
  return prev
}
