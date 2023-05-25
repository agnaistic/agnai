import { Import, X } from 'lucide-solid'
import { Component, For, Show, createSignal, onMount } from 'solid-js'
import { AppSchema } from '../../../srv/db/schema'
import Button from '../../shared/Button'
import FileInput, { FileInputResult, getFileAsString } from '../../shared/FileInput'
import Modal from '../../shared/Modal'
import { characterStore, NewCharacter, toastStore } from '../../store'
import { extractCardData } from './card-utils'
import AvatarIcon from '/web/shared/AvatarIcon'

const SUPPORTED_FORMATS = 'Agnaistic, CAI, TavernAI, TextGen, Pygmalion'
const MAX_SHOWN_IMPORTS = 3

const IMAGE_FORMATS: Record<string, boolean> = {
  png: true,
  jpg: true,
  jpeg: true,
}

const TEXT_FORMATS: Record<string, boolean> = {
  json: true,
}

const ImportCharacterModal: Component<{
  show: boolean
  close: () => void
  onSave: (chars: NewCharacter[]) => void
  charhubPath?: string
}> = (props) => {
  const state = characterStore()
  const [imported, setImported] = createSignal<NewCharacter[]>([])
  const [failed, setFailed] = createSignal<string[]>([])
  const [ready, setReady] = createSignal(false)

  onMount(async () => {
    if (!props.charhubPath) return
    try {
      const { json } = await downloadCharacterHub(props.charhubPath)
      setImported([json])
      toastStore.success('Successfully downloaded from Character Hub')
      setReady(true)
    } catch (ex: any) {
      toastStore.error(`Character Hub download failed: ${ex.message}`)
    }
  })

  const processFiles = async (files: FileInputResult[]) => {
    reset()

    await Promise.all(
      files.map(async (file) => {
        try {
          const ext = file.file.name.split('.').slice(-1)[0]
          if (IMAGE_FORMATS[ext]) {
            await processImage(file)
            return
          }

          if (TEXT_FORMATS[ext]) {
            await processJSON(file)
            return
          }

          throw new Error(
            `Invalid file format: ${file.file.name}. Supported formats: ${SUPPORTED_FORMATS}`
          )
        } catch (ex: any) {
          setFailed(failed().concat(file.file.name))
          toastStore.error(`Failed to import ${file.file.name}: ${ex.message}`)
        }
      })
    )

    setReady(imported().length > 0)
  }

  const processJSON = async (file: FileInputResult) => {
    const content = await getFileAsString(file)
    const json = JSON.parse(content)
    const char = jsonToCharacter(json)
    char.tags = char.tags?.concat('imported') ?? ['imported']
    setImported(imported().concat(char))
    toastStore.success('Character file accepted')
  }

  const processImage = async (file: FileInputResult) => {
    const json = await extractCardData(file.file)
    if (!json) {
      throw new Error('Invalid tavern image')
    }
    const char = Object.assign(jsonToCharacter(json), { avatar: file.file })
    char.tags = char.tags?.concat('imported') ?? ['imported']
    setImported(imported().concat(char))
    toastStore.success('Tavern card accepted')
  }

  const onImport = async () => {
    if (!ready()) return
    props.onSave(imported())
  }

  const reset = () => {
    setReady(false)
    setImported([])
    setFailed([])
  }

  const cancel = () => {
    reset()
    props.close()
  }

  return (
    <Modal
      show={props.show}
      title="Import Character"
      close={cancel}
      footer={
        <>
          <Button schema="secondary" onClick={cancel}>
            <X />
            Cancel
          </Button>

          <Button onClick={onImport} disabled={state.creating || !ready()}>
            <Import />
            Import
          </Button>
        </>
      }
    >
      <div class="flex flex-col gap-2">
        <FileInput
          label="Avatar or JSON file"
          fieldName="file"
          accept="text/json,application/json,image/png,image/jpeg"
          helperText={`Supported formats: ${SUPPORTED_FORMATS}`}
          required
          multiple
          onUpdate={processFiles}
        />
      </div>

      <Show when={imported().length}>
        <div class="mt-2 text-lg">Characters to import:</div>
        <div class="markdown">
          <ul>
            <For each={imported().slice(0, MAX_SHOWN_IMPORTS)}>
              {(i) => (
                <li class="flex gap-2">
                  <AvatarIcon format={{ corners: 'circle', size: 'sm' }} avatarUrl={i.avatar} />
                  {i.name ?? 'Unnamed'}
                </li>
              )}
            </For>
            <Show when={imported().length === MAX_SHOWN_IMPORTS + 1}>
              <li>... and one other</li>
            </Show>
            <Show when={imported().length > MAX_SHOWN_IMPORTS + 1}>
              <li>... and {imported().length - MAX_SHOWN_IMPORTS} others</li>
            </Show>
          </ul>
        </div>
      </Show>

      <Show when={failed().length}>
        <div class="mt-2 text-lg">Failed character imports:</div>
        <div class="markdown">
          <ul>
            <For each={failed().slice(0, MAX_SHOWN_IMPORTS)}>
              {(i) => <li>{i ?? 'Unnamed'}</li>}
            </For>
            <Show when={failed().length === MAX_SHOWN_IMPORTS + 1}>
              <li>... and one other</li>
            </Show>
            <Show when={failed().length > MAX_SHOWN_IMPORTS + 1}>
              <li>... and {failed().length - MAX_SHOWN_IMPORTS} others</li>
            </Show>
          </ul>
        </div>
      </Show>
    </Modal>
  )
}

export default ImportCharacterModal

type ImportFormat = keyof typeof formatMaps | 'agnai'

const formatMaps = {
  tavern: {
    name: 'name',
    persona: ['description', 'personality'],
    scenario: 'scenario',
    greeting: 'first_mes',
    sampleChat: 'mes_example',
  },
  ooba: {
    name: 'char_name',
    persona: ['char_persona'],
    scenario: 'world_scenario',
    greeting: 'char_greeting',
    sampleChat: 'example_dialogue',
  },
} satisfies Record<string, ImportKeys>

type ImportKeys = {
  name: string
  persona: string[]
  greeting: string
  scenario: string
  sampleChat: string
}

function jsonToCharacter(json: any): NewCharacter {
  const format = getImportFormat(json)

  if (format === 'agnai') {
    return json
  }

  const map = formatMaps[format]

  const persona = map.persona
    .map((key) => json[key])
    .filter((text) => !!text)
    .join('\n')

  const char: NewCharacter = {
    name: json[map.name],
    greeting: json[map.greeting],
    persona: {
      kind: 'text',
      attributes: {
        text: [persona],
      },
    },
    sampleChat: json[map.sampleChat],
    scenario: json[map.scenario],
    originalAvatar: undefined,
  }

  return char
}

function getImportFormat(obj: any): ImportFormat {
  if (obj.kind === 'character' || isNative(obj)) return 'agnai'
  if ('char_name' in obj) return 'ooba'
  if ('mes_example' in obj) return 'tavern'

  throw new Error('Unknown import format')
}

function isNative(obj: any): obj is AppSchema.Character {
  return !!obj.name && !!obj.persona && !!obj.greeting && !!obj.scenario && !!obj.sampleChat
}

/**
 *
 * @param path Character `fullPath`
 */
export async function downloadCharacterHub(path: string) {
  // const imageUrl = `https://avatars.charhub.io/avatars/${path}/avatar.webp`
  const apiUrl = `https://api.characterhub.org/api`

  const card = await fetch(`${apiUrl}/characters/download`, {
    method: 'post',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format: 'tavern', fullPath: path, version: 'main' }),
  }).then((res) => res.blob())

  const file = new File([card], `charhub_${slugify(path)}.png`, { type: 'image/png' })
  const data = await extractCardData(file)
  const json = jsonToCharacter(data)
  json.avatar = file
  return { card, file, json }
}

function slugify(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
