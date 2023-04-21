import { Component, For, Show, createMemo, createSignal, onMount } from 'solid-js'
import { NewCharacter, characterStore, chatStore } from '../../store'
import PageHeader from '../../shared/PageHeader'
import Select from '../../shared/Select'
import TextInput from '../../shared/TextInput'
import { AppSchema } from '../../../srv/db/schema'
import { Copy, Download, Edit, Menu, Trash, VenetianMask } from 'lucide-solid'
import { A, useNavigate } from '@solidjs/router'
import AvatarIcon from '../../shared/AvatarIcon'
import ImportCharacterModal from '../Character/ImportCharacter'
import { DownloadModal } from '../Character/CharacterList'
import DeleteCharacterModal from '../Character/DeleteCharacter'
import { getAssetUrl } from '../../shared/util'
import { DropMenu } from '../../shared/DropMenu'
import Button from '../../shared/Button'

const Dashboard: Component = () => {
  const chats = chatStore()

  const [view, setView] = createSignal('card')
  const [sort, setSort] = createSignal('age-desc')
  const [search, setSearch] = createSignal('')

  onMount(() => {
    characterStore.getCharacters()
  })

  return (
    <>
      <PageHeader title="Home" />

      <div class="mb-2 flex flex-wrap items-center">
        <div class="m-1">
          <TextInput
            class="m-1"
            fieldName="search"
            placeholder="Search by name..."
            onKeyUp={(ev) => setSearch(ev.currentTarget.value)}
          />
        </div>
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
      <Characters type={view()} filter={search()} sort={sort()} />
    </>
  )
}

export default Dashboard

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
  const [showImport, setImport] = createSignal(false)

  const onImport = (char: NewCharacter) => {
    characterStore.createCharacter(char, () => setImport(false))
  }

  return (
    <>
      <Show when={props.type === 'list'}>
        <div class="flex w-full flex-col gap-2">
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
        <div class="grid w-full grid-cols-2 flex-row flex-wrap justify-center gap-2 sm:grid-cols-6">
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

      <ImportCharacterModal show={showImport()} close={() => setImport(false)} onSave={onImport} />
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
    <div class="flex flex-col items-center justify-between gap-1 rounded-md bg-[var(--bg-800)] p-1">
      <div class="flex w-full justify-end" onClick={() => setOpts(true)}>
        <div>
          <Menu size={14} class="icon-button" />
        </div>
        <DropMenu show={opts()} close={() => setOpts(false)} horz="left" vert="down">
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

      <Show when={props.char.avatar}>
        <A href={`/character/${props.char._id}/chats`} class="flex justify-center">
          <img src={getAssetUrl(props.char.avatar!)} class="max-h-32 max-w-full rounded-lg" />
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
      <div class="flex w-full justify-center text-sm">
        <div class="overflow-hidden text-ellipsis whitespace-nowrap font-bold">
          {props.char.name}
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
