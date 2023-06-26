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
import {
  attributes,
  defaultBody,
  getEmoteExpressions,
  getRandomBody,
  manifest,
} from '/web/asset/sprite'
import PageHeader from '../PageHeader'
import Button from '../Button'
import { ArrowLeft, ArrowRight, Check, Dices } from 'lucide-solid'
import Select from '../Select'
import { createDebounce, hexToRgb } from '../util'
import ColorPicker from '../ColorPicker'
import { EmoteType, FullSprite, SpriteAttr, classifyEmotes } from '/common/types/sprite'
import { useEffect } from '../hooks'
import { AppSchema } from '/common/types'
import { msgsApi } from '/web/store/data/messages'
import { altJailbreak, classifyTemplate } from '/common/default-preset'
import { toastStore } from '/web/store'

const Y_OFFSET = 0
const HEIGHT = 1200 + Y_OFFSET
const WIDTH = 1000

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

  const [body, setBody] = createSignal(props.body || { ...defaultBody })
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
  }

  const [handleColor, disposeColor] = createDebounce((hex: string) => {
    const prop = getColorProp(attr())
    if (!prop) return
    setBody({ ...body(), [prop]: hex })
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
              <AttributeSelect type={body()[attr()]} update={updateAttr} />

              <div class="flex gap-2">
                <Button
                  class="h-10 px-4"
                  onClick={() => setBody(getRandomBody({ gender: body().gender }))}
                >
                  <Dices />
                </Button>

                <Button
                  class="h-10 px-4"
                  onClick={() => updateAttr('gender', body().gender === 'male' ? 'female' : 'male')}
                >
                  Body
                </Button>
              </div>
            </div>
            <div class="flex w-full justify-between">
              <div class="flex items-center gap-2">
                <Select
                  items={[
                    { label: 'Color: hair', value: 'front_hair' },
                    { label: 'Color: eyes', value: 'eyes' },
                    { label: 'Color: body', value: 'body' },
                  ]}
                  onChange={(v) => setAttr(v.value as any)}
                  fieldName=""
                />
                <ColorPicker
                  fieldName="color"
                  onInput={handleColor}
                  disabled={!RECOLOR[attr()]}
                  value={getAttrColor(body(), attr())}
                />
              </div>

              <Button onClick={() => props.onChange?.(body())}>
                <Check /> Confirm
              </Button>
            </div>
          </header>

          <section
            ref={bound!}
            class={`${styles.preview} relative h-full w-full select-none border-[1px] border-[var(--bg-900)]`}
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
    const calculated = calculateBounds()
    return { width: calculated.width + 'px', height: calculated.height + 'px' }
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
        <AvatarCanvas body={body()!} style={getStyle()}></AvatarCanvas>

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
}> = (props) => {
  return (
    <>
      <For each={attributes}>
        {(attr, i) => {
          return (
            <CanvasPart
              attr={attr}
              type={props.body[attr]}
              style={{
                width: props.style.width,
                height: props.style.height,
              }}
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
  style: { width: string; height: string }
}

const CanvasPart: Component<CanvasProps> = (props) => {
  let top: HTMLCanvasElement
  let bottom: HTMLCanvasElement

  const [state, setState] = createSignal('')

  createEffect(() => {
    top.style.aspectRatio = '1 / 1.2'
    top.style.width = props.style.width
    top.style.height = props.style.height
    bottom.style.aspectRatio = '1 / 1.2'
    bottom.style.width = props.style.width
    bottom.style.height = props.style.height
  })

  createEffect(async () => {
    const hash = getHash(props)
    if (hash === state()) return

    setState(hash)

    const ctx = top.getContext('2d')
    const over = bottom.getContext('2d')
    if (!ctx || !over) return

    ctx.clearRect(0, 0, top.width, top.height)
    over.clearRect(0, 0, top.width, top.height)

    if (!props.type || props.type === 'none') return

    const promises: Array<Promise<HTMLImageElement>> = []

    for (const file of manifest[props.attr][props.type]) {
      const image = asyncImage(toImage(props.body.gender, props.attr, props.type, file))
      promises.push(image)
    }

    const images = await Promise.all(promises)

    for (const image of images) {
      ctx.drawImage(image, 0, Y_OFFSET, top.width, top.height)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      // For particular attributes we will render a second re-colored image on top of the original
      const shouldColor = canColor(props.attr, image.src)
      const prop = getColorProp(props.attr)
      const color = prop ? props.body[prop] : undefined

      if (shouldColor && color) {
        const alpha = IS_EYES[props.attr] ? '0.3' : '0.6'
        const { r, g, b } = hexToRgb(color)!
        over.drawImage(image, 0, Y_OFFSET, top.width, top.height)
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
      <canvas
        class="absolute left-0 right-0 top-0 mx-auto"
        ref={top!}
        width={WIDTH}
        height={HEIGHT - Y_OFFSET}
      ></canvas>
      <canvas
        class="absolute left-0 right-0 top-0 mx-auto"
        ref={bottom!}
        width={WIDTH}
        height={HEIGHT - Y_OFFSET}
      ></canvas>
    </>
  )
}

const AttributeSelect: Component<{
  type: string
  update: (attr: SpriteAttr, type: string) => void
}> = (props) => {
  const [attr, setAttr] = createSignal(attributes[0])

  const options = createMemo(() => {
    return (
      attributes
        .slice()
        .sort()
        // .filter((attr) => attr !== 'body')
        .map((value) => ({ label: value.replace(/_/g, ' '), value }))
    )
  })

  const move = (dir: -1 | 1) => {
    const opts = manifest.attributes[attr()]
    let curr = opts.indexOf(props.type) + dir

    if (curr < 0) curr = opts.length - 1
    if (curr >= opts.length) curr = 0

    console.log(attr(), '---->', opts[curr])
    props.update(attr(), opts[curr])
  }

  return (
    <div class="flex gap-2">
      <Select
        fieldName="attribute"
        items={options()}
        value={attr()}
        onChange={(value) => setAttr(value.value as any)}
      />
      <Button schema="hollow" onClick={() => move(-1)}>
        <ArrowLeft />
      </Button>
      <Button schema="hollow" onClick={() => move(1)}>
        <ArrowRight />
      </Button>
    </div>
  )
}

export default AvatarBuilder

function toImage(gender: string, attr: SpriteAttr, type: string, file: string) {
  const id = `${gender}-${attr}-${type}-${file}`.replace('.png', '')
  return `https://agnai-assets.sgp1.digitaloceanspaces.com/sprites/${id}.png`
}

function asyncImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.src = src

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
  if (!prop) return '#000000'

  return body[prop] || '#000000'
}

export function useAutoExpression() {
  const [expr, setExpr] = createSignal<EmoteType>('neutral')
  const [reset, setReset] = createSignal(Date.now() + 1000)

  const update = (emote: EmoteType) => {
    setReset(Date.now() + 5000)
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
        setReset(Date.now() + 10000)
      } else {
        update('blink')
        setReset(Date.now() + 200)
      }
    }, 100)

    return () => clearInterval(timer)
  })

  return { expr, update, classify }
}
