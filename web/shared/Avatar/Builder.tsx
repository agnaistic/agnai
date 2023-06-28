import styles from './avatar.module.scss'
import {
  Component,
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from 'solid-js'
import { attributes, getEmoteExpressions, getRandomBody, manifest } from '/web/asset/sprite'
import PageHeader from '../PageHeader'
import Button from '../Button'
import { ArrowLeft, ArrowRight, Dices } from 'lucide-solid'
import Select from '../Select'
import { createDebounce, parseHex } from '../util'
import { ColorPickerV2 } from '../ColorPicker'
import { EmoteType, FullSprite, SpriteAttr, classifyEmotes } from '/common/types/sprite'
import { useEffect } from '../hooks'
import { AppSchema } from '/common/types'
import { msgsApi } from '/web/store/data/messages'
import { altJailbreak, classifyTemplate } from '/common/default-preset'
import { toastStore } from '/web/store'
import { getImageData } from '/web/store/data/chars'

const BASE_URL = `https://agnai-assets.sgp1.digitaloceanspaces.com/sprites`
const BLANK_IMG = `${BASE_URL}/blank.png`

const imageCache = new Map<string, string>()

const Y_OFFSET = 0
const HEIGHT = 600 + Y_OFFSET
const WIDTH = 500

const IS_HAIR: { [key in SpriteAttr]?: boolean } = {
  back_hair: true,
  front_hair: true,
  eye_cover_hair: true,
}

const IS_BODY: { [key in SpriteAttr]?: boolean } = {
  body: true,
}

const IS_EYES: { [key in SpriteAttr]?: boolean } = {
  eyes: true,
}

const RECOLOR: { [key in SpriteAttr]?: boolean } = {
  eyes: true,
  body: true,
  back_hair: true,
  front_hair: true,
  eye_cover_hair: true,
}

const RATIO = (HEIGHT - Y_OFFSET) / WIDTH

const AvatarBuilder: Component<{
  body?: FullSprite
  resize?: boolean
  onChange?: (body: FullSprite) => void
  bounds?: HTMLElement
  noHeader?: boolean
}> = (props) => {
  let bound: HTMLElement = {} as any

  const [body, setBody] = createSignal(props.body || getRandomBody())
  const [base, setBase] = createSignal({ w: 500, h: 600 })
  const [bounds, setBounds] = createSignal({ w: 0, h: 0 })
  const [attr, setAttr] = createSignal(attributes[0])

  const calculateBounds = () => {
    const width = props.bounds?.clientWidth || bound.clientWidth
    const height = props.bounds?.clientHeight || bound.clientHeight

    if (width * RATIO < height) {
      return { w: width, h: width * RATIO }
    } else if (height / RATIO < width) {
      return { w: height / RATIO, h: height }
    } else {
      return { w: width, h: width * RATIO }
    }
  }

  const [obs] = createSignal(
    new ResizeObserver(() => {
      setBase(calculateBounds())
      setBounds(base())
    })
  )

  onMount(() => {
    obs().observe(props.bounds || bound)
    setBase(calculateBounds())
    setBounds(base())
  })

  onCleanup(() => {
    obs().disconnect()
  })

  const getStyle = createMemo(() => {
    const max = bounds()
    return { width: max.w + 'px', height: max.h + 'px' }
  })

  const updateAttr = <T extends keyof FullSprite>(attr: T, type: FullSprite[T]) => {
    const next = { ...body(), [attr]: type }
    setBody(next)
    props.onChange?.(body())
  }

  const [handleColor, disposeColor] = createDebounce((hex: string) => {
    const prop = getColorProp(attr())
    if (!prop) return
    updateAttr(prop, hex)
  }, 16)

  onCleanup(() => {
    disposeColor()
  })

  return (
    <>
      <Show when={!props.noHeader}>
        <PageHeader title="Character Builder" />
      </Show>
      <div class="flex select-none justify-center">
        <main class="flex w-full flex-col">
          <header class={`${styles.header} mt-2 flex w-full flex-col items-center gap-2`}>
            <div class="flex w-full justify-between gap-2">
              <AttributeSelect body={body()} update={updateAttr} />
            </div>
            <div class="flex w-full justify-between">
              <div class="flex items-center gap-2">
                <Select
                  class="w-24"
                  items={[
                    { label: 'hair color', value: 'front_hair' },
                    { label: 'eye color', value: 'eyes' },
                    { label: 'body color', value: 'body' },
                  ]}
                  onChange={(v) => setAttr(v.value as any)}
                  fieldName=""
                />
                <ColorPickerV2
                  onInput={handleColor}
                  onChange={handleColor}
                  value={getAttrColor(body(), attr())}
                />
              </div>
              <div class="flex gap-2">
                <Button
                  class="px-4"
                  onClick={() => setBody(getRandomBody({ gender: body().gender }))}
                >
                  <Dices size={16} />
                </Button>
                <Button
                  class="h-8 px-4"
                  onClick={() => updateAttr('gender', body().gender === 'male' ? 'female' : 'male')}
                >
                  Body
                </Button>
              </div>
            </div>
          </header>

          <section
            ref={bound!}
            class={`${styles.preview} relative h-full min-h-[50vh] w-full select-none border-[1px] border-[var(--bg-900)]`}
          >
            <AvatarCanvas body={body()} style={getStyle()}></AvatarCanvas>
          </section>
        </main>
      </div>
    </>
  )
}

export const AvatarContainer: Component<{
  container: HTMLElement
  expression?: EmoteType
  body?: FullSprite
  zoom?: number
}> = (props) => {
  let bound: HTMLDivElement = {} as any
  const [bounds, setBounds] = createSignal({ w: 0, h: 0 })
  const [obs] = createSignal(
    new ResizeObserver(() => {
      setBounds({ w: props.container.clientWidth, h: props.container.clientHeight })
    })
  )

  onMount(() => {
    setBounds({ w: props.container.clientWidth, h: props.container.clientHeight })
    obs().observe(props.container)
  })

  onCleanup(() => {
    obs().disconnect()
  })

  const body = createMemo(() => {
    if (!props.body) return null

    const expr = getEmoteExpressions(props.expression || 'neutral')
    return {
      ...props.body,
      ...expr,
    }
  })

  const calculateBounds = () => {
    const max = bounds()
    if (max.w * RATIO < max.h) {
      return { rule: 'mw*R < mh', width: max.w, height: max.w * RATIO }
    }
    if (max.h / RATIO < max.w) {
      return { rule: 'mh/R < mw', width: max.h / RATIO, height: max.h }
    }

    return { rule: '?', width: max.w, height: max.h }
  }

  const getStyle = createMemo(() => {
    // console.log('W', props.container?.clientWidth, ',', bound.clientWidth, ',', max.w)
    // console.log('H', props.container?.clientHeight, ',', bound.clientHeight, ',', max.h)
    const calc = calculateBounds()
    return {
      width: calc.width + 'px',
      height: calc.height + 'px',
      'min-width': calc.width + 'px',
      'min-height': calc.height + 'px',
    }
  })

  return (
    <Show when={props.body}>
      <div
        ref={bound!}
        class={`${styles.preview} relative mx-auto h-full w-full select-none`}
        style={{ height: getStyle().height }}
        // style={{ width: props.container.clientWidth + 'px' }}
      >
        <div class="absolute left-0 right-0 top-0  mx-auto rounded-md" style={getStyle()} />
        <AvatarCanvas zoom={props.zoom} body={body()!} style={getStyle()}></AvatarCanvas>

        {/* <Draggable onChange={dragging} onDone={dragged}></Draggable> */}
      </div>
    </Show>
  )
}

export const AvatarCanvas: Component<{
  style: { width: string; height: string }
  children?: any
  body: FullSprite
  class?: string
  zoom?: number
}> = (props) => {
  return (
    <>
      <For each={attributes}>
        {(attr, i) => {
          return (
            <CanvasPart
              zoom={props.zoom}
              attr={attr}
              type={props.body[attr]}
              style={props.style}
              body={props.body}
            />
          )
        }}
      </For>
      {props.children}
    </>
  )
}

type CanvasProps = {
  attr: SpriteAttr
  type: string
  body: FullSprite
  zoom?: number
  style: { width: string; height: string }
}

const CanvasPart: Component<CanvasProps> = (props) => {
  let top: HTMLImageElement
  let bottom: HTMLCanvasElement

  const [state, setState] = createSignal('')

  const show = createMemo(() => {
    const prop = getColorProp(props.attr)
    if (!prop) return false
    if (!props.body[prop]) return false
    return true
  })

  createEffect(() => {
    if (!bottom) return

    // bottom.style.aspectRatio = '1 / 1.2'
    bottom.style.width = props.style.width
    bottom.style.height = props.style.height
  })

  const baseImages = createMemo(() => {
    const files = manifest[props.attr][props.type] || []
    const images = files.map((id) => toImage(props.body.gender, props.attr, props.type, id))
    return images
  })

  createEffect(async () => {
    const promises: Array<Promise<HTMLImageElement>> = []
    const attrFiles = manifest[props.attr][props.type] || []
    const imageNames = attrFiles.map((file) =>
      toImage(props.body.gender, props.attr, props.type, file)
    )

    const prop = getColorProp(props.attr)
    const hasColor = prop ? props.body[prop] : false

    if (!hasColor) {
      return
    }

    if (!bottom) {
      return
    }

    const hash = getHash(props)
    if (hash === state()) return

    setState(hash)

    const over = bottom.getContext('2d')

    if (!over) {
      return
    }

    over.clearRect(0, 0, WIDTH, HEIGHT)

    if (!props.type || props.type === 'none') return

    for (const name of imageNames) {
      if (!canColor(props.attr, name)) continue
      const image = asyncImage(name)
      promises.push(image)
    }

    const images = await Promise.allSettled(promises)

    for (const result of images) {
      if (result.status !== 'fulfilled') continue
      const image = result.value
      // For particular attributes we will render a second re-colored image on top of the original
      const color = prop ? props.body[prop] : undefined

      if (color) {
        // const alpha = IS_EYES[props.attr] ? '0.3' : '0.6'
        const { r, g, b, alpha = 0.5 } = parseHex(color)!
        over.drawImage(image, 0, Y_OFFSET, WIDTH, HEIGHT)

        const orig = over.globalCompositeOperation
        over.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
        over.globalCompositeOperation = 'source-in'
        over.fillRect(0, 0, WIDTH, HEIGHT - Y_OFFSET)
        over.fillStyle = ''
        over.globalCompositeOperation = orig
      }
    }
  })

  return (
    <>
      <For each={baseImages()}>
        {(src) => (
          <img
            class="absolute left-0 right-0 top-0 mx-auto"
            src={src}
            ref={top!}
            style={{ ...props.style, transform: `scale(${props.zoom || 1})` }}
            onError={(ev) => {
              ev.currentTarget.src = BLANK_IMG
            }}
          />
        )}
      </For>
      <Show when={show()}>
        <canvas
          class="absolute left-0 right-0 top-0 mx-auto"
          ref={bottom!}
          width={WIDTH}
          height={HEIGHT - Y_OFFSET}
          style={{ ...props.style, transform: `scale(${props.zoom || 1})` }}
        ></canvas>
      </Show>
    </>
  )
}

const AttributeSelect: Component<{
  body: FullSprite
  update: (attr: SpriteAttr, type: string) => void
}> = (props) => {
  const [attr, setAttr] = createSignal(attributes[0])

  const options = createMemo(() => {
    return attributes
      .slice()
      .sort()
      .map((value) => ({ label: value.replace(/_/g, ' '), value }))
  })

  const types = createMemo(() => {
    const opts = manifest.attributes[attr()]
    return opts.map((name) => ({ value: name, label: name.replace(/_/g, ' ') }))
  })

  const move = (dir: -1 | 1) => {
    const opts = manifest.attributes[attr()]
    let curr = opts.indexOf(props.body[attr()]) + dir

    if (curr < 0) curr = opts.length - 1
    if (curr >= opts.length) curr = 0

    props.update(attr(), opts[curr])
  }

  return (
    <div class="flex gap-2">
      <Select
        class="w-24"
        fieldName="attribute"
        items={options()}
        value={attr()}
        onChange={(value) => setAttr(value.value as any)}
      />
      <Select
        class="w-24"
        fieldName="type"
        items={types()}
        value={props.body[attr()]}
        onChange={(opt) => props.update(attr(), opt.value)}
      />
      <Button schema="hollow" onClick={() => move(-1)}>
        <ArrowLeft size={16} />
      </Button>
      <Button schema="hollow" onClick={() => move(1)}>
        <ArrowRight size={16} />
      </Button>
    </div>
  )
}

export default AvatarBuilder

function toImage(gender: string, attr: SpriteAttr, type: string, file: string) {
  const id = `${gender}-${attr}-${type}-${file}`.replace('.png', '')
  return `${BASE_URL}/${id}.png`
}

function asyncImage(src: string) {
  return new Promise<HTMLImageElement>(async (resolve, reject) => {
    let data = imageCache.get(src)

    if (!data) {
      const blob = await fetch(src)
        .then((res) => {
          if (res.status >= 400) throw new Error(res.statusText)
          return res.blob()
        })
        .catch((err) => ({ err }))

      if ('err' in blob) return reject(blob)

      data = await getImageData(blob)
      imageCache.set(src, data!)
    }

    const image = new Image()
    image.src = data!

    image.onload = () => resolve(image)
    image.onerror = (ev) => reject(ev)
  })
}

function canColor(attr: SpriteAttr, file: string) {
  if (!RECOLOR[attr]) return false

  if (attr === 'body' && file.includes('skin.')) return true
  return file.includes('base.')
}

function getColorProp(attr: SpriteAttr): keyof FullSprite | void {
  if (IS_BODY[attr]) return 'bodyColor'
  if (IS_EYES[attr]) return 'eyeColor'
  if (IS_HAIR[attr]) return 'hairColor'
}

function getHash({ body, attr, type }: CanvasProps) {
  const prop = getColorProp(attr)
  const color = prop ? body[prop] : 'none'

  return `${attr}-${type}-${body.gender}-${color}`
}

function getAttrColor(body: FullSprite, attr: SpriteAttr) {
  const prop = getColorProp(attr)
  if (!prop) return '#0000007f'
  const value = body[prop]
  if (!value) return '#0000007f'

  return (value + '7f').slice(0, 9)
}

const TIMERS = {
  EMOTE: 20000,
  BLINK_INTERVAL: 15000,
  BLINK_LENGTH: 200,
}

export function useAutoExpression() {
  const [expr, setExpr] = createSignal<EmoteType>('neutral')
  const [reset, setReset] = createSignal(Date.now() + 1000)

  const update = (emote: EmoteType) => {
    setReset(Date.now() + TIMERS.EMOTE)
    setExpr(emote)
  }

  const classify = async (settings: Partial<AppSchema.GenSettings>, message: string) => {
    const prompt = (
      settings.service === 'openai' ? `${altJailbreak}\n\n${classifyTemplate}` : classifyTemplate
    ).replace(`{{message}}`, message)

    await msgsApi.basicInference({ settings, prompt }, (err, resp) => {
      if (err) {
        toastStore.warn(`Could not classify message: ${err}`)
        return
      }

      if (resp) {
        const lowered = resp.trim().toLowerCase()
        const match = classifyEmotes.find((emote) => lowered.includes(emote))
        if (match) {
          console.log('Classifiation:', match)
          update(match)
        } else {
          console.warn(`Classify returned noise: ${resp}`)
        }
      }
    })
  }

  useEffect(() => {
    const timer = setInterval(() => {
      if (Date.now() < reset()) return

      if (expr() === 'blink' && expr() !== 'neutral') {
        update('neutral')
        setReset(Date.now() + TIMERS.BLINK_INTERVAL)
      } else {
        update('blink')
        setReset(Date.now() + TIMERS.BLINK_LENGTH)
      }
    }, 100)

    return () => clearInterval(timer)
  })

  return { expr, update, classify }
}
