import { Component, Match, Switch, createMemo, createSignal } from 'solid-js'
import { AppSchema } from '/common/types/schema'
import Select from '/web/shared/Select'
import Modal from '/web/shared/Modal'
import Button from '/web/shared/Button'
import { Save, X } from 'lucide-solid'
import { getAssetUrl } from '/web/shared/util'
import text from 'png-chunk-text'
import extract from 'png-chunks-extract'
import encode from 'png-chunks-encode'
import { exportCharacter } from '/common/characters'
import { ALLOWED_TYPES, getImageData } from '/web/store/data/chars'

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
  char: AppSchema.Character
}> = (props) => {
  let ref: any
  const opts = createMemo(
    () => {
      return props.char?.persona.kind === 'text' ? plainFormats : formats
    },
    { equals: false }
  )

  const fileTypeItems = createMemo(() => {
    const opts = [{ value: 'json', label: 'JSON' }]
    if (props.char?.avatar) {
      opts.unshift({ value: 'png', label: 'Image Card' })
    }
    return opts
  })

  const [format, setFormat] = createSignal('tavern')
  const [fileType, setFileType] = createSignal<string>(props.char?.avatar ? 'png' : 'json')
  const [schema, setSchema] = createSignal(props.char?.persona?.kind || opts()[0].value)

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
        <div class="flex flex-row gap-3">
          <Select
            label="Output Format"
            fieldName="app"
            value={format()}
            items={[
              { value: 'tavern', label: 'Tavern' },
              // TODO: We don't need to support exporting in Agnaistic format
              // once we fully support Chara Card V2. We just need to put
              // Agnai-specific fields in the `extensions` prop.
              { value: 'native', label: 'Agnaistic' },
              { value: 'ooba', label: 'Textgen' },
            ]}
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
                  charToJson(props.char!, format(), schema())
                )}`}
                download={`${props.char!.name}.json`}
              >
                <Button>
                  <Save /> Download (JSON)
                </Button>
              </a>
            </Match>

            <Match when={fileType() === 'png'}>
              <Button
                onClick={() =>
                  downloadImage(
                    charToJson(props.char!, format(), schema()),
                    getAssetUrl(props.char!.avatar!)!,
                    props.char!.name
                  )
                }
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

/**
 *
 * @param json
 * @param image Base64 or URL
 * @param name Character name
 */
async function downloadImage(json: string, image: string, name: string) {
  const { ext } = getExt(image)
  const mimetype = ALLOWED_TYPES.get(ext)!

  /**
   * Only PNG and APNG files can contain embedded character information
   * If the avatar image is not either of these formats, we must convert it
   */

  const base64 = await imageToDataURL(image, mimetype).then((res) => res.split(',')[1])
  const imgBuffer = Buffer.from(window.atob(base64), 'binary')
  const chunks = extract(imgBuffer).filter((chunk) => chunk.name !== 'tEXt')
  const output = Buffer.from(json, 'utf8').toString('base64')
  const lastChunkIndex = chunks.length - 1
  const chunksToExport = [
    ...chunks.slice(0, lastChunkIndex),
    text.encode('chara', output),
    chunks[lastChunkIndex],
  ]
  const anchor = document.createElement('a')
  anchor.href = URL.createObjectURL(new Blob([Buffer.from(encode(chunksToExport))]))
  anchor.download = `${name}.card.${ext}`
  anchor.click()
  URL.revokeObjectURL(anchor.href)
}

async function imageToDataURL(image: string, mimetype?: string) {
  const { ext } = getExt(image)

  const base64 = await getImageBase64(image)
  if (ext === 'apng') {
    return base64
  }

  const element = document.createElement('img')
  element.setAttribute('crossorigin', 'anonymous')
  element.src = base64

  const canvas = document.createElement('canvas')
  canvas.width = element.naturalWidth
  canvas.height = element.naturalHeight
  const ctx = canvas.getContext('2d')
  ctx?.drawImage(element, 0, 0)
  const dataUrl = canvas.toDataURL(mimetype || 'image/png')
  return dataUrl
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

function getExt(url: string): { type: 'base64' | 'url'; ext: string } {
  if (url.startsWith('data:')) {
    const [header] = url.split(',')
    const ext = header.slice(11, -7)
    return ALLOWED_TYPES.has(ext) ? { type: 'base64', ext } : { type: 'base64', ext: 'unknown' }
  }

  const ext = url.split('.').slice(-1)[0]
  if (ALLOWED_TYPES.has(ext)) return { type: 'url', ext }
  return { type: 'url', ext: 'unknown' }
}

async function getImageBase64(image: string) {
  if (image.startsWith('data:')) return image

  if (!image.startsWith('http')) {
    image = getAssetUrl(image)
  }

  const base64 = await getImageData(image)
  return base64!
}
