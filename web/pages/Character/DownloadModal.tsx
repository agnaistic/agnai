import { Component, Match, Switch, createMemo, createSignal, onMount } from 'solid-js'
import { AppSchema } from '/common/types/schema'
import Select from '/web/shared/Select'
import Modal from '/web/shared/Modal'
import Button from '/web/shared/Button'
import { Save, X } from 'lucide-solid'
import { exportCharacter } from '/common/characters'
import { charsApi } from '/web/store/data/chars'
import { toastStore } from '/web/store'
import { downloadCharCard } from './util'

type CharacterFileType = 'png' | 'json'

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
  charId: string
  char?: AppSchema.Character
}> = (props) => {
  let ref: any
  const [char, setChar] = createSignal<AppSchema.Character | undefined>(props.char)
  const opts = createMemo(
    () => ((props.char || char())?.persona.kind === 'text' ? plainFormats : formats),
    { equals: false }
  )

  onMount(async () => {
    if (props.char) return
    const res = await charsApi.getCharacterDetail(props.charId)
    if (res.result) {
      setChar(res.result)
    }

    if (res.error) {
      toastStore.error(`Failed to retrieve character for download: ${res.error}`)
    }
  })

  const fileTypeItems = createMemo(() => {
    const opts = [{ value: 'json', label: 'JSON' }]
    if (char()?.avatar) {
      opts.unshift({ value: 'png', label: 'Image Card' })
    }
    return opts
  })

  const [format, setFormat] = createSignal('tavern')
  const [fileType, setFileType] = createSignal<string>(char()?.avatar ? 'png' : 'json')
  const [schema, setSchema] = createSignal(char()?.persona?.kind || opts()[0].value)
  const outputs = createMemo(() => {
    // TODO: We don't need to support exporting in Agnaistic format
    // once we fully support Chara Card V2. We just need to put
    // Agnai-specific fields in the `extensions` prop.

    const base = [{ value: 'tavern', label: 'Tavern' }]
    if (fileType() === 'png') return base
    return base.concat([
      { value: 'native', label: 'Agnaistic' },
      { value: 'ooba', label: 'Textgen' },
    ])
  })

  return (
    <Modal
      show={props.show && !!char()}
      close={props.close}
      title="Download Character"
      footer={
        <Button schema="secondary" onClick={props.close}>
          <X /> Close
        </Button>
      }
    >
      <form ref={ref} class="flex flex-col gap-4">
        <div class="flex flex-row gap-3">
          <Select
            label="Output Format"
            fieldName="app"
            value={format()}
            items={outputs()}
            onChange={(item) => setFormat(item.value)}
          />
          <Select
            label="File type"
            fieldName="fileType"
            value={fileType()}
            items={fileTypeItems()}
            onChange={(item) => setFileType(item.value as CharacterFileType)}
          />
        </div>
        <div class="flex">
          <Select
            label="Persona Format"
            helperText="If exporting to Agnaistic format, this does not matter"
            fieldName="format"
            items={opts()}
            value={schema()}
            onChange={(item) => setSchema(item.value as any)}
            disabled={format() === 'native'}
          />
        </div>
        <div class="flex w-full justify-center">
          <Switch>
            <Match when={fileType() === 'json'}>
              <a
                href={`data:text/json:charset=utf-8,${encodeURIComponent(
                  charToJson(props.char || char()!, format(), schema())
                )}`}
                download={`${char()!.name}.json`}
              >
                <Button>
                  <Save /> Download (JSON)
                </Button>
              </a>
            </Match>

            <Match when={fileType() === 'png'}>
              <Button
                onClick={() => downloadCharCard(props.char || props.charId, format(), schema())}
              >
                <Save /> Download (PNG)
              </Button>
            </Match>
          </Switch>
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
