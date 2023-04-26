import { Import, X } from 'lucide-solid'
import { Component, createSignal } from 'solid-js'
import { AppSchema } from '../../../srv/db/schema'
import Button from '../../shared/Button'
import FileInput, { FileInputResult, getFileAsString } from '../../shared/FileInput'
import Modal from '../../shared/Modal'
import { characterStore, NewCharacter, toastStore } from '../../store'
import { extractTavernData } from './tavern-utils'

export type ImportCharacter = NewCharacter & { avatar?: File; originalAvatar?: any }

const supportedFormats = 'Agnaistic, CAI, TavernAI, TextGen, Pygmalion'

const ImportCharacterModal: Component<{
  show: boolean
  close: () => void
  onSave: (chars: ImportCharacter[]) => void
}> = (props) => {
  const state = characterStore()
  const imported: ImportCharacter[] = []
  const [ready, setReady] = createSignal(0)

  const processFiles = async (files: FileInputResult[]) => {
    setReady(0)
    imported.length = 0
    files.forEach((file) => {
      const extension = file.file.name.split('.').pop()?.toLowerCase() || ''
      const isImg = ['png', 'jpg', 'jpeg'].includes(extension)
      if (isImg) {
        processImage(file)
        return
      }

      const isJSON = ['json'].includes(extension)
      if (isJSON) {
        processJSON(file)
        return
      }

      toastStore.warn(
        `Invalid file format: ${file.file.name}. Supported formats: ${supportedFormats}`
      )
    })
  }

  const processJSON = async (file: FileInputResult) => {
    try {
      const content = await getFileAsString(file)
      const json = JSON.parse(content)
      imported.push(jsonToCharacter(json))
      setReady(ready() + 1)
      toastStore.success('Character file accepted')
    } catch (ex: any) {
      toastStore.warn(`Failed to import ${file.file.name}: ${ex.message}`)
    }
  }

  const processImage = async (file: FileInputResult) => {
    const tav = await extractTavernData(file.file)
    if (tav) {
      imported.push({ ...jsonToCharacter(tav), avatar: file.file })
      setReady(ready() + 1)
      toastStore.success('Tavern card accepted')
    }
  }

  const onImport = async () => {
    if (!ready()) return
    props.onSave(imported)
  }

  return (
    <Modal
      show={props.show}
      title="Import Character"
      close={props.close}
      footer={
        <>
          <Button schema="secondary" onClick={props.close}>
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
