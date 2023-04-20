import { Component, createEffect, createMemo, createSignal, For, onMount, Show } from 'solid-js'
import Button from '../../shared/Button'
import PageHeader from '../../shared/PageHeader'
import { Copy, Download, Edit, Import, Plus, Save, Trash, X } from 'lucide-solid'
import { AppSchema } from '../../../srv/db/schema'
import { A } from '@solidjs/router'
import AvatarIcon from '../../shared/AvatarIcon'
import { characterStore, NewCharacter } from '../../store'
import ImportCharacterModal from './ImportCharacter'
import DeleteCharacterModal from './DeleteCharacter'
import Modal from '../../shared/Modal'
import Select from '../../shared/Select'
import { exportCharacter } from '../../../common/prompt'

const CharacterList: Component = () => {
  const chars = characterStore((s) => s.characters)

  const [showImport, setImport] = createSignal(false)
  const [showDelete, setDelete] = createSignal<AppSchema.Character>()
  const [char, setChar] = createSignal<AppSchema.Character>()

  const onImport = (char: NewCharacter) => {
    characterStore.createCharacter(char, () => setImport(false))
  }

  onMount(() => {
    characterStore.getCharacters()
  })

  return (
    <>
      <PageHeader title="Characters" subtitle="" />

      <Show when={!chars.loaded}>
        <div>Loading...</div>
      </Show>
      <Show when={chars.loaded}>
        <div class="flex w-full flex-col gap-2">
          <div class="flex w-full justify-end gap-2">
            <Button onClick={() => setImport(true)}>
              <Import />
              Import
            </Button>
            <A href="/character/create">
              <Button>
                <Plus />
                Create
              </Button>
            </A>
          </div>
          <For each={chars.list}>
            {(char) => (
              <Character
                character={char}
                delete={() => setDelete(char)}
                download={() => setChar(char)}
              />
            )}
          </For>
        </div>
        {!chars.list?.length ? <NoCharacters /> : null}
      </Show>
      <ImportCharacterModal show={showImport()} close={() => setImport(false)} onSave={onImport} />
      <DownloadModal show={!!char()} close={() => setChar()} char={char()} />
      <DeleteCharacterModal
        char={showDelete()}
        show={!!showDelete()}
        close={() => setDelete(undefined)}
      />
    </>
  )
}

const Character: Component<{
  character: AppSchema.Character
  delete: () => void
  download: () => void
}> = (props) => {
  return (
    <div class="flex w-full gap-2">
      <div class="flex h-12 w-full flex-row items-center gap-4 rounded-xl bg-[var(--bg-800)]">
        <A
          class="ml-4 flex h-3/4 cursor-pointer items-center rounded-2xl  sm:w-9/12"
          href={`/character/${props.character._id}/chats`}
        >
          <AvatarIcon avatarUrl={props.character.avatar} class="mx-4" />
          <div class="text-lg">
            <span class="font-bold">{props.character.name}</span>
            <span class="ml-2">{props.character.description}</span>
          </div>
        </A>
      </div>
      <div class="flex flex-row items-center justify-center gap-2 sm:w-3/12">
        <a onClick={props.download}>
          <Download class="icon-button" />
        </a>
        <A href={`/character/${props.character._id}/edit`}>
          <Edit class="icon-button" />
        </A>

        <A href={`/character/create/${props.character._id}`}>
          <Copy class="icon-button" />
        </A>

        <Trash class="icon-button" onClick={props.delete} />
      </div>
    </div>
  )
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
