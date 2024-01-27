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
import { useTransContext } from '@mbarzda/solid-i18next'
import { TFunction } from 'i18next'

type CharacterFileType = 'png' | 'json'

const plainFormats = (t: TFunction) => [{ value: 'text', label: t('plain_text') }]

const formats = (t: TFunction) => [{ value: 'attributes', label: t('key_value') }]

/**
 * WIP: Enable downloading characters in different persona formats for different application targets
 */

export const DownloadModal: Component<{
  show: boolean
  close: () => void
  charId: string
  char?: AppSchema.Character
}> = (props) => {
  const [t] = useTransContext()

  let ref: any
  const [char, setChar] = createSignal<AppSchema.Character | undefined>(props.char)
  const opts = createMemo(
    () => ((props.char || char())?.persona.kind === 'text' ? plainFormats(t) : formats(t)),
    { equals: false }
  )

  onMount(async () => {
    if (props.char) return
    const res = await charsApi.getCharacterDetail(props.charId)
    if (res.result) {
      setChar(res.result)
    }

    if (res.error) {
      toastStore.error(
        t('failed_to_retrieve_character_for_download_x', {
          message: res.error,
        })
      )
    }
  })

  const fileTypeItems = createMemo(() => {
    const opts = [{ value: 'json', label: t('json') }]
    if (char()?.avatar) {
      opts.unshift({ value: 'png', label: t('image_card') })
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
      { value: 'native', label: t('agnaistic') },
      { value: 'ooba', label: t('text_gen') },
    ])
  })

  return (
    <Modal
      show={props.show && !!char()}
      close={props.close}
      title={t('download_character')}
      footer={
        <Button schema="secondary" onClick={props.close}>
          <X /> {t('close')}
        </Button>
      }
    >
      <form ref={ref} class="flex flex-col gap-4">
        <div class="flex flex-row gap-3">
          <Select
            label={t('output_format')}
            fieldName="app"
            value={format()}
            items={outputs()}
            onChange={(item) => setFormat(item.value)}
          />
          <Select
            label={t('file_type')}
            fieldName="fileType"
            value={fileType()}
            items={fileTypeItems()}
            onChange={(item) => setFileType(item.value as CharacterFileType)}
          />
        </div>
        <div class="flex">
          <Select
            label={t('persona_format')}
            helperText={t('persona_format_message')}
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
                  <Save /> {t('download_json')}
                </Button>
              </a>
            </Match>

            <Match when={fileType() === 'png'}>
              <Button
                onClick={() => downloadCharCard(t, props.char || props.charId, format(), schema())}
              >
                <Save /> {t('download_png')}
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
