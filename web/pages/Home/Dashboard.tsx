import { Component, For, Show, createSignal, onMount } from 'solid-js'
import { NewCharacter, characterStore, chatStore } from '../../store'
import PageHeader from '../../shared/PageHeader'
import Select from '../../shared/Select'
import TextInput from '../../shared/TextInput'
import { AppSchema } from '../../../srv/db/schema'
import { Copy, Download, Edit, Trash, VenetianMask } from 'lucide-solid'
import { A } from '@solidjs/router'
import AvatarIcon from '../../shared/AvatarIcon'
import ImportCharacterModal from '../Character/ImportCharacter'
import { DownloadModal } from '../Character/CharacterList'
import DeleteCharacterModal from '../Character/DeleteCharacter'
import { getAssetUrl } from '../../shared/util'

const Dashboard: Component = () => {
  const chats = chatStore()

  const [view, setView] = createSignal('card')
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
            onChange={(value) => setSearch(value.currentTarget.value)}
          />
        </div>
        <Select
          class="m-1"
          fieldName="viewType"
          items={[
            { value: 'mod-asc', label: 'Sort: Last modified - ASC' },
            { value: 'mod-desc', label: 'Sort: Last modified - DESC' },
            { value: 'age-asc', label: 'Sort: Created - ASC' },
            { value: 'age-desc', label: 'Sort: Created - DESC' },
            { value: 'alpha-asc', label: 'Sort: Name - ASC' },
            { value: 'alpha-desc', label: 'Sort: Name - DESC' },
          ]}
          onChange={(next) => setView(next.value)}
        />

        <Select
          class="m-1"
          fieldName="viewType"
          items={[
            { value: 'list', label: 'View: List' },
            { value: 'card', label: 'View: Card' },
          ]}
          onChange={(next) => setView(next.value)}
          value={view()}
        />
      </div>
      <Characters type={view()} filter={search()} />
    </>
  )
}

export default Dashboard

const Characters: Component<{ type: string; filter: string }> = (props) => {
  const chars = characterStore((s) => s.characters)

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
          <For each={chars.list}>
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
        <div class="flex w-full flex-row flex-wrap justify-center gap-2">
          <For each={chars.list}>
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
  if (props.type === 'list') {
    return (
      <div class="flex w-full gap-2">
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

  return (
    <A
      href={`/character/${props.char._id}/chats`}
      class="flex w-[calc(50%-8px)] flex-col items-center justify-between gap-2 rounded-md bg-[var(--bg-800)] p-1 sm:w-[calc(25%-8px)]"
    >
      <Show when={props.char.avatar}>
        {/* <div
          // src={getAssetUrl(props.char.avatar!)}
          class="m-auto h-full w-full justify-center rounded-lg object-scale-down"
          style={{
            'background-size': 'contain',
            'background-image': `url(${getAssetUrl(props.char.avatar!)})`,
            'background-repeat': 'no-repeat',
          }}
        /> */}
        <div class="flex max-h-48 justify-center">
          <img src={getAssetUrl(props.char.avatar!)} class="max-h-full max-w-full rounded-lg" />
        </div>
      </Show>
      <Show when={!props.char.avatar}>
        <div class="flex h-48 w-full items-center justify-center rounded-md bg-[var(--bg-700)]">
          <VenetianMask size={24} />
        </div>
      </Show>
      <div class="font-bold">{props.char.name}</div>
    </A>
  )
}
