import { Import, X } from 'lucide-solid'
import { Component, For, Show, createEffect, createSignal } from 'solid-js'
import { AppSchema } from '../../../srv/db/schema'
import Button from '../../shared/Button'
import FileInput, { FileInputResult, getFileAsString } from '../../shared/FileInput'
import Modal from '../../shared/Modal'
import { characterStore, NewCharacter, toastStore } from '../../store'
import { extractTavernData } from './tavern-utils'

export type ImportCharacter = NewCharacter & { avatar?: File; originalAvatar?: any }

const supportedFormats = 'Agnaistic, CAI, TavernAI, TextGen, Pygmalion'
const maxShownImports = 3

const ImportCharacterModal: Component<{
  show: boolean
  close: () => void
  onSave: (chars: ImportCharacter[]) => void
}> = (props) => {
  const state = characterStore()
  const [imported, setImported] = createSignal<NewCharacter[]>([])
  const [failed, setFailed] = createSignal<string[]>([])
  const [ready, setReady] = createSignal(false)

  const processFiles = async (files: FileInputResult[]) => {
    setReady(false)
    setImported([])
    setFailed([])
    await Promise.all(
      files.map(async (file) => {
        try {
          const extension = file.file.name.split('.').pop()?.toLowerCase() || ''
          const isImg = ['png', 'jpg', 'jpeg'].includes(extension)
          if (isImg) {
            await processImage(file)
            return
          }

          const isJSON = ['json'].includes(extension)
          if (isJSON) {
            await processJSON(file)
            return
          }

          throw new Error(
            `Invalid file format: ${file.file.name}. Supported formats: ${supportedFormats}`
          )
        } catch (ex: any) {
          setFailed([...failed(), file.file.name])
          toastStore.error(`Failed to import ${file.file.name}: ${ex.message}`)
        }
      })
    )
    setReady(!!imported().length)
  }

  const processJSON = async (file: FileInputResult) => {
    const content = await getFileAsString(file)
    const json = JSON.parse(content)
    setImported([...imported(), jsonToCharacter(json)])
    toastStore.success('Character file accepted')
  }

  const processImage = async (file: FileInputResult) => {
    const json = await extractTavernData(file.file)
    if (!json) {
      throw new Error('Invalid tavern image')
    }
    setImported([...imported(), jsonToCharacter(json)])
    toastStore.success('Tavern card accepted')
  }

  const onImport = async () => {
    if (!ready()) return
    props.onSave(imported())
  }

  const cancel = () => {
    setReady(false)
    setImported([])
    setFailed([])
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
          helperText={`Supported formats: ${supportedFormats}`}
          required
          multiple
          onUpdate={processFiles}
        />
      </div>

      <Show when={imported().length}>
        <div class="mt-2 text-lg">Characters to import:</div>
        <div class="markdown">
          <ul>
            <For each={imported().slice(0, maxShownImports)}>
              {(i) => <li>{i.name ?? 'Unnamed'}</li>}
            </For>
            <Show when={imported().length === maxShownImports + 1}>
              <li>... and one other</li>
            </Show>
            <Show when={imported().length > maxShownImports + 1}>
              <li>... and {imported().length - maxShownImports} others</li>
            </Show>
          </ul>
        </div>
      </Show>

      <Show when={failed().length}>
        <div class="mt-2 text-lg">Failed character imports:</div>
        <div class="markdown">
          <ul>
            <For each={failed().slice(0, maxShownImports)}>{(i) => <li>{i ?? 'Unnamed'}</li>}</For>
            <Show when={failed().length === maxShownImports + 1}>
              <li>... and one other</li>
            </Show>
            <Show when={failed().length > maxShownImports + 1}>
              <li>... and {failed().length - maxShownImports} others</li>
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
