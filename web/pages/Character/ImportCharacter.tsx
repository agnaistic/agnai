import { Import, X } from 'lucide-solid'
import { Component, For, Show, createSignal, onMount } from 'solid-js'
import { AppSchema } from '../../../srv/db/schema'
import Button from '../../shared/Button'
import FileInput, { FileInputResult, getFileAsString } from '../../shared/FileInput'
import Modal from '../../shared/Modal'
import { characterStore, NewCharacter, toastStore } from '../../store'
import { extractCardData } from './card-utils'
import { characterBookToNative } from '/common/memory'
import { formatCharacter } from '/common/characters'
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

type ImportFormat = 'tavern' | 'tavernV2' | 'ooba' | 'agnai'

function jsonToCharacter(json: any): NewCharacter {
  const format = getImportFormat(json)

  if (format === 'agnai') {
    return json
  }

  if (format === 'ooba') {
    return {
      name: json.char_name,
      greeting: json.char_greeting,
      persona: {
        kind: 'text',
        attributes: {
          text: [json.char_persona],
        },
      },
      sampleChat: json.example_dialogue,
      scenario: json.world_scenario,
      originalAvatar: undefined,
    }
  }

  if (format === 'tavern') {
    return {
      name: json.name,
      greeting: json.first_mes,
      persona: {
        kind: 'text',
        attributes: {
          text: [[json.description, json.personality].filter((text) => !!text).join('\n')],
        },
      },
      sampleChat: json.mes_example,
      scenario: json.scenario,
      originalAvatar: undefined,
    }
  }

  // format === 'tavernV2'
  /** Tests, in the case we previously saved the lossless Agnai "Persona" data, whether the card has been edited in another application since then, causing the saved "Persona" data to be obsolete. */
  const isSavedPersonaMissingOrOutdated =
    json.data.extensions.agnai?.persona === undefined ||
    formatCharacter(json.data.name, json.data.extensions.agnai?.persona) !== json.data.description

  return {
    name: json.data.name,
    greeting: json.data.first_mes,
    persona: isSavedPersonaMissingOrOutdated
      ? {
          kind: 'text',
          attributes: {
            text: [
              [json.data.description, json.data.personality].filter((text) => !!text).join('\n'),
            ],
          },
        }
      : json.data.extensions.agnai.persona,
    sampleChat: json.data.mes_example,
    scenario: json.data.scenario,
    originalAvatar: undefined,
    alternateGreetings: json.data.alternate_greetings,
    characterBook: json.data.character_book
      ? characterBookToNative(json.data.character_book)
      : undefined,
    extensions: json.data.extensions,
    systemPrompt: json.data.system_prompt,
    postHistoryInstructions: json.data.post_history_instructions,
    creator: json.data.creator,
    characterVersion: json.data.character_version,
    tags: json.data.tags,
    description: json.data.creator_notes,
    voice: json.data.extensions.agnai?.voice,
  }
}

function getImportFormat(obj: any): ImportFormat {
  if (obj.kind === 'character' || isNative(obj)) return 'agnai'
  if ('char_name' in obj) return 'ooba'
  if (obj.spec === 'chara_card_v2') return 'tavernV2'
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
