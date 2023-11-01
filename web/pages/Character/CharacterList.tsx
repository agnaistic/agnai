import { Component, Match, Show, Switch, createEffect, createMemo, createSignal } from 'solid-js'
import { NewCharacter, characterStore, chatStore, userStore } from '../../store'
import { tagStore } from '../../store'
import PageHeader from '../../shared/PageHeader'
import Select, { Option } from '../../shared/Select'
import TextInput from '../../shared/TextInput'
import { AppSchema } from '../../../common/types/schema'
import { Import, Plus, SortAsc, SortDesc, LayoutList, Image } from 'lucide-solid'
import { A, useSearchParams } from '@solidjs/router'
import ImportCharacterModal from '../Character/ImportCharacter'
import DeleteCharacterModal from '../Character/DeleteCharacter'
import { storage, setComponentPageTitle } from '../../shared/util'
import Button from '../../shared/Button'
import Loading from '../../shared/Loading'
import TagSelect from '../../shared/TagSelect'
import { DownloadModal } from './DownloadModal'
import { SortDirection, SortField, ViewType } from './components/types'
import { CharacterListView } from './components/CharacterListView'
import { CharacterCardView } from './components/CharacterCardView'
import { CharacterFolderView } from './components/CharacterFolderView'

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
  { value: 'created', label: 'Created' },
  { value: 'name', label: 'Name' },
]

const CharacterList: Component = () => {
  setComponentPageTitle('Characters')

  const [query, setQuery] = useSearchParams()

  const user = userStore()
  const state = chatStore((s) => ({
    list: s.allChars.list.filter((ch) => ch.userId === user.user?._id),
    loading: s.allLoading,
    loaded: s.loaded,
  }))

  const cached = getListCache()
  const [view, setView] = createSignal(cached.view || 'list')
  const [sortField, setSortField] = createSignal(cached.sort.field)
  const [sortDirection, setSortDirection] = createSignal(cached.sort.direction)
  const [search, setSearch] = createSignal('')
  const [showImport, setImport] = createSignal(false)
  const [importPath, setImportPath] = createSignal<string | undefined>(query.import)
  const importQueue: NewCharacter[] = []

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

  const getNextView = (): ViewType => {
    const curr = view()
    return curr === 'list' ? 'cards' : curr === 'cards' ? 'folders' : 'list'
  }

  createEffect(() => {
    if (!state.list.length) return
    tagStore.updateTags(state.list)
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
    <>
      <PageHeader
        title={
          <div class="flex w-full justify-between">
            <div>Characters</div>
            <div class="flex text-base">
              <div class="px-1">
                <Button onClick={() => setImport(true)}>
                  <Import />
                  <span class="hidden sm:inline">Import</span>
                </Button>
              </div>
              <div class="px-1">
                <A href="/character/create">
                  <Button>
                    <Plus />
                    <span class="hidden sm:inline">Create</span>
                  </Button>
                </A>
              </div>
            </div>
          </div>
        }
      />

      <div class="mb-2 flex justify-between">
        <div class="flex flex-wrap">
          <div class="m-1 ml-0 mr-1">
            <TextInput
              fieldName="search"
              placeholder="Search by name..."
              onKeyUp={(ev) => setSearch(ev.currentTarget.value)}
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
      <Characters
        characters={state.list}
        loading={state.loading || false}
        loaded={!!state.loaded}
        type={view()}
        filter={search()}
        sortField={sortField()}
        sortDirection={sortDirection()}
      />
      <ImportCharacterModal
        charhubPath={importPath()}
        show={showImport() || !!importPath()}
        close={() => setImport(false)}
        onSave={onImport}
      />
    </>
  )
}

const Characters: Component<{
  characters: AppSchema.Character[]
  loading: boolean
  loaded: boolean
  type: ViewType
  filter: string
  sortField: SortField
  sortDirection: SortDirection
}> = (props) => {
  const tags = tagStore((s) => ({ filter: s.filter, hidden: s.hidden }))
  const [showGrouping, setShowGrouping] = createSignal(false)
  const groups = createMemo(() => {
    const list = props.characters
      .slice()
      .filter((ch) => ch.name.toLowerCase().includes(props.filter.toLowerCase()))
      .filter((ch) => tags.filter.length === 0 || ch.tags?.some((t) => tags.filter.includes(t)))
      .filter((ch) => !ch.tags || !ch.tags.some((t) => tags.hidden.includes(t)))
      .sort(getSortFunction(props.sortField, props.sortDirection))

    const groups = [
      { label: 'Favorites', list: list.filter((c) => c.favorite) },
      { label: '', list: list.filter((c) => !c.favorite) },
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
      <Switch fallback={<div>Failed to load characters. Refresh to try again.</div>}>
        <Match when={props.loading}>
          <div class="flex justify-center">
            <Loading />
          </div>
        </Match>
        <Match when={props.characters.length === 0 && props.loaded}>
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
            />
          </Show>

          <Show when={props.type === 'cards'}>
            <CharacterCardView
              groups={groups()}
              showGrouping={showGrouping()}
              toggleFavorite={toggleFavorite}
              setDelete={setDelete}
              setDownload={setDownload}
            />
          </Show>

          <Show when={props.type === 'folders'}>
            <CharacterFolderView
              groups={groups()}
              showGrouping={showGrouping()}
              toggleFavorite={toggleFavorite}
              setDelete={setDelete}
              setDownload={setDownload}
              sort={props.sortDirection}
              characters={props.characters}
            />
          </Show>
        </Match>
      </Switch>

      <Show when={download()}>
        <DownloadModal show close={() => setDownload()} charId={download()!._id} />
      </Show>
      <DeleteCharacterModal
        char={showDelete()}
        show={!!showDelete()}
        close={() => setDelete(undefined)}
      />
    </>
  )
}

function getSortableValue(char: AppSchema.Character, field: SortField) {
  switch (field) {
    case 'name':
      return char.name.toLowerCase()
    case 'created':
      return char.createdAt
    case 'modified':
      return char.updatedAt
    default:
      return 0
  }
}

function getSortFunction(field: SortField, direction: SortDirection) {
  return (left: AppSchema.Character, right: AppSchema.Character) => {
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
    You have no characters!&nbsp;
    <A class="text-[var(--hl-500)]" href="/character/create">
      Create a character
    </A>
    &nbsp;to get started!
  </div>
)

export default CharacterList
