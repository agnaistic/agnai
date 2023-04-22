import { Component, For, Show, createEffect, createMemo, createSignal, onMount } from 'solid-js'
import { NewCharacter, characterStore, chatStore } from '../../store'
import PageHeader from '../../shared/PageHeader'
import Select from '../../shared/Select'
import TextInput from '../../shared/TextInput'
import { AppSchema } from '../../../srv/db/schema'
import {
  Copy,
  Download,
  Edit,
  Menu,
  Save,
  Trash,
  VenetianMask,
  X,
  Import,
  Plus,
} from 'lucide-solid'
import { A, useNavigate } from '@solidjs/router'
import AvatarIcon from '../../shared/AvatarIcon'
import ImportCharacterModal from '../Character/ImportCharacter'
import DeleteCharacterModal from '../Character/DeleteCharacter'
import { getAssetUrl } from '../../shared/util'
import { DropMenu } from '../../shared/DropMenu'
import Button from '../../shared/Button'
import Modal from '../../shared/Modal'
import { exportCharacter } from '../../../common/prompt'
import Loading from '../../shared/Loading'

const CACHE_KEY = 'agnai-charlist-cache'

const CharacterList: Component = () => {
  const chats = chatStore()

  const cached = getListCache()
  const [view, setView] = createSignal(cached.view)
  const [sort, setSort] = createSignal(cached.sort)
  const [search, setSearch] = createSignal('')
  const [showImport, setImport] = createSignal(false)

  const onImport = (char: NewCharacter) => {
    characterStore.createCharacter(char, () => setImport(false))
  }

  onMount(() => {
    characterStore.getCharacters()
  })

  createEffect(() => {
    const next = {
      view: view(),
      sort: sort(),
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

      <div class="mb-2 flex flex-wrap items-center justify-between">
        <div class="flex flex-wrap items-center">
          <div class="m-1">
            <TextInput
              class="m-1"
              fieldName="search"
              placeholder="Search by name..."
              onKeyUp={(ev) => setSearch(ev.currentTarget.value)}
            />
          </div>
          <div class="flex">
            <Select
              class="m-1"
              fieldName="viewType"
              items={[
                { value: 'mod-asc', label: 'Modified - ASC' },
                { value: 'mod-desc', label: 'Modified - DESC' },
                { value: 'age-asc', label: 'Created - ASC' },
                { value: 'age-desc', label: 'Created - DESC' },
                { value: 'alpha-asc', label: 'Name - ASC' },
                { value: 'alpha-desc', label: 'Name - DESC' },
              ]}
              value={sort()}
              onChange={(next) => setSort(next.value)}
            />

            <Select
              class="m-1"
              fieldName="viewType"
              items={[
                { value: 'list', label: 'List' },
                { value: 'card', label: 'Card' },
              ]}
              onChange={(next) => setView(next.value)}
              value={view()}
            />
          </div>
        </div>
      </div>
      <Characters type={view()} filter={search()} sort={sort()} />
      <ImportCharacterModal show={showImport()} close={() => setImport(false)} onSave={onImport} />
    </>
  )
}

const Characters: Component<{ type: string; filter: string; sort: string }> = (props) => {
  const state = characterStore((s) => s.characters)

  const chars = createMemo(() => {
    const list = state.list
      .slice()
      .filter((ch) => ch.name.toLowerCase().includes(props.filter.toLowerCase()))
      .sort(sort(props.sort))
    return list
  })

  const [showDelete, setDelete] = createSignal<AppSchema.Character>()
  const [download, setDownload] = createSignal<AppSchema.Character>()
  return (
    <>
      <Show when={!state.loaded}>
        <div class="flex justify-center">
          <Loading />
        </div>
      </Show>
      <Show when={state.list.length === 0 && state.loaded}>
        <NoCharacters />
      </Show>
      <Show when={state.list.length > 0}>
        <Show when={props.type === 'list'}>
          <div class="flex w-full flex-col gap-2 pb-5">
            <For each={chars()}>
              {(char) => (
                <Character
                  type={props.type}
                  char={char}
                  delete={() => setDelete(char)}
                  download={() => setDownload(char)}
                />
              )}
            </For>
          </div>
        </Show>

        <Show when={props.type !== 'list'}>
          <div class="grid w-full grid-cols-[repeat(auto-fit,minmax(105px,1fr))] flex-row flex-wrap justify-start gap-2 pb-5">
            <For each={chars()}>
              {(char) => (
                <Character
                  type={props.type}
                  char={char}
                  delete={() => setDelete(char)}
                  download={() => setDownload(char)}
                />
              )}
            </For>
          </div>
        </Show>
      </Show>

      <DownloadModal show={!!download()} close={() => setDownload()} char={download()} />
      <DeleteCharacterModal
        char={showDelete()}
        show={!!showDelete()}
        close={() => setDelete(undefined)}
      />
    </>
  )
}

const Character: Component<{
  type: string
  char: AppSchema.Character
  delete: () => void
  download: () => void
}> = (props) => {
  const [opts, setOpts] = createSignal(false)
  const nav = useNavigate()
  if (props.type === 'list') {
    return (
      <div class="relative flex w-full gap-2">
        <div class="flex h-12 w-full flex-row items-center gap-4 rounded-xl bg-[var(--bg-800)]">
          <A
            class="ml-4 flex h-3/4 cursor-pointer items-center rounded-2xl sm:w-full"
            href={`/character/${props.char._id}/chats`}
          >
            <AvatarIcon avatarUrl={props.char.avatar} class="mx-4" />
            <div class="text-lg">
              <span class="font-bold">{props.char.name}</span>
              <span class="ml-2">{props.char.description}</span>
            </div>
          </A>
        </div>
        <div class="flex flex-row items-center justify-center gap-2 sm:w-3/12">
          <a onClick={props.download}>
            <Download class="icon-button" />
          </a>
          <A href={`/character/${props.char._id}/edit`}>
            <Edit class="icon-button" />
          </A>

          <A href={`/character/create/${props.char._id}`}>
            <Copy class="icon-button" />
          </A>

          <Trash class="icon-button" onClick={props.delete} />
        </div>
      </div>
    )
  }

  const wrap = (fn: Function) => () => {
    setOpts(false)
    fn()
  }

  return (
    <div class="flex flex-col items-center justify-between gap-1 rounded-md bg-[var(--bg-700)] p-1">
      <div class="w-full">
        <Show when={props.char.avatar}>
          <A
            href={`/character/${props.char._id}/chats`}
            class="block h-32 w-full justify-center overflow-hidden rounded-lg"
          >
            <img src={getAssetUrl(props.char.avatar!)} class="h-full w-full object-cover" />
          </A>
        </Show>
        <Show when={!props.char.avatar}>
          <A
            href={`/character/${props.char._id}/chats`}
            class="flex h-32 w-full items-center justify-center rounded-md bg-[var(--bg-700)]"
          >
            <VenetianMask size={24} />
          </A>
        </Show>
      </div>
      <div class="w-full text-sm">
        <div class="overflow-hidden text-ellipsis whitespace-nowrap px-1 font-bold">
          {props.char.name}
        </div>
        {/* hacky positioning shenanigans are necessary as opposed to using an
            absolute positioning because if any of the DropMenu parent is
            positioned, then DropMenu breaks because it relies on the nearest
            positioned parent to be the sitewide container */}
        <div
          class="float-right mt-[-149px] mr-[3px] flex justify-end"
          onClick={() => setOpts(true)}
        >
          <div class=" rounded-md bg-[var(--bg-500)] p-[2px]">
            <Menu size={24} class="icon-button" color="var(--bg-100)" />
          </div>
          <DropMenu
            show={opts()}
            close={() => setOpts(false)}
            customPosition="right-[-6px] top-[-3px]"
          >
            <div class="flex flex-col gap-2 p-2">
              <Button size="sm" onClick={wrap(props.download)}>
                Download
              </Button>
              <Button size="sm" onClick={() => nav(`/character/${props.char._id}/edit`)}>
                Edit
              </Button>
              <Button size="sm" onClick={() => nav(`/character/create/${props.char._id}`)}>
                Duplicate
              </Button>
              <Button size="sm" onClick={wrap(props.delete)}>
                Delete
              </Button>
            </div>
          </DropMenu>
        </div>
      </div>
    </div>
  )
}

function sort(direction: string) {
  return (left: AppSchema.Character, right: AppSchema.Character) => {
    const [kind, dir] = direction.split('-')
    const mod = dir === 'asc' ? 1 : -1
    const l = kind === 'alpha' ? left.name : kind === 'age' ? left.createdAt : left.updatedAt
    const r = kind === 'alpha' ? right.name : kind === 'age' ? right.createdAt : right.updatedAt

    return l > r ? mod : l === r ? 0 : -mod
  }
}

function getListCache() {
  const existing = localStorage.getItem(CACHE_KEY)

  if (!existing) {
    return { sort: 'asc-desc', view: 'list' }
  }

  return JSON.parse(existing)
}

function saveListCache(cache: any) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
}

const plainFormats = [{ value: 'text', label: 'Plain Text' }]

const formats = [
  { value: 'boostyle', label: 'Boostyle' },
  { value: 'wpp', label: 'W++' },
  { value: 'sbf', label: 'Square Bracket Format' },
]

/**
 * WIP: Enable downloading characters in different persona formats for different application targets
 */

export const DownloadModal: Component<{
  show: boolean
  close: () => void
  char?: AppSchema.Character
}> = (props) => {
  let ref: any
  const opts = createMemo(
    () => {
      return props.char?.persona.kind === 'text' ? plainFormats : formats
    },
    { equals: false }
  )

  const [format, setFormat] = createSignal('native')
  const [schema, setSchema] = createSignal(opts()[0].value)

  return (
    <Modal
      show={props.show && !!props.char}
      close={props.close}
      title="Download Character"
      footer={
        <Button schema="secondary" onClick={props.close}>
          <X /> Close
        </Button>
      }
    >
      <form ref={ref} class="flex flex-col gap-4">
        <Select
          label="Output Format"
          fieldName="app"
          value={format()}
          items={[
            { value: 'native', label: 'Agnaistic' },
            { value: 'tavern', label: 'TavernAI' },
            { value: 'ooba', label: 'Textgen' },
          ]}
          onChange={(item) => setFormat(item.value)}
        />
        <div class="flex">
          <Select
            label="Persona Format"
            helperText="If exporting to Agnaistic format, this does not matter"
            fieldName="format"
            items={opts()}
            value={schema()}
            onChange={(item) => setSchema(item.value)}
            disabled={format() === 'native'}
          />
        </div>
        <div class="flex w-full justify-center">
          <a
            href={`data:text/json:charset=utf-8,${encodeURIComponent(
              charToJson(props.char!, format(), schema())
            )}`}
            download={`${props.char!.name}.json`}
          >
            <Button>
              <Save />
              Download
            </Button>
          </a>
        </div>
      </form>
    </Modal>
  )
}

function charToJson(char: AppSchema.Character, format: string, schema: string) {
  const { _id, ...json } = char

  const copy = { ...char }
  copy.persona.kind = schema as any

  if (format === 'native') {
    return JSON.stringify(json, null, 2)
  }

  const content = exportCharacter(copy, format as any)
  return JSON.stringify(content, null, 2)
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
