import { Import, X } from 'lucide-solid'
import { Component, createSignal } from 'solid-js'
import { AppSchema } from '../../../srv/db/schema'
import Button from '../../shared/Button'
import FileInput, { FileInputResult, getFileAsString } from '../../shared/FileInput'
import Modal from '../../shared/Modal'
import { characterStore, NewCharacter, toastStore } from '../../store'
import { extractTavernData } from './util'

export type ImportCharacter = NewCharacter & { avatar?: File; originalAvatar?: any }

const ImportCharacterModal: Component<{
  show: boolean
  close: () => void
  onSave: (char: ImportCharacter) => void
}> = (props) => {
  const state = characterStore()
  const [json, setJson] = createSignal<any>(undefined)
  const [avatar, setAvatar] = createSignal<File | undefined>(undefined)

  const updateJson = async (files: FileInputResult[]) => {
    if (!files.length) return setJson()
    try {
      const content = await getFileAsString(files[0])
      const json = JSON.parse(content)
      importJson(json)
      toastStore.success('Character file accepted')
    } catch (ex) {
      toastStore.warn(
        'Invalid file format. Supported formats: Agnaistic, CAI, TavernAI, TextGen, Pygmalion'
      )
    }
  }

  const importJson = (json: any) => {
    try {
      const char = jsonToCharacter(json)

      setJson(char)
    } catch (ex) {
      toastStore.warn(
        'Invalid file format. Supported formats: Agnaistic, CAI, Tavern JSON/Cards, TextGen, Pygmalion'
      )
    }
  }

  const updateAvatar = async (files: FileInputResult[]) => {
    if (!files.length) setAvatar()
    else {
      const tav = await extractTavernData(files[0].file)
      if (tav) {
        importJson(tav)
        toastStore.success('Tavern card accepted')
      }
      setAvatar(() => files[0].file)
    }
  }

  const onImport = async () => {
    if (!json()) return
    props.onSave({ ...json(), avatar: avatar() })
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

          <Button onClick={onImport} disabled={state.creating}>
            <Import />
            Import
          </Button>
        </>
      }
    >
      <div class="flex flex-col gap-2">
        <FileInput
          label="JSON File"
          fieldName="json"
          accept="text/json,application/json"
          helperText="Supported formats: Agnaistic, CAI, TavernAI, TextGen, Pygmalion"
          required
          onUpdate={updateJson}
        />

        <FileInput
          fieldName="avatar"
          label="Avatar or TavernCard"
          accept="image/png,image/jpeg"
          onUpdate={updateAvatar}
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
