import imgs from '../../asset/sprites/images/*.png'
import styles from './avatar.module.scss'
import {
  Component,
  For,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from 'solid-js'
import {
  SpriteAttr,
  SpriteBody,
  attributes,
  defaultBody,
  getRandomBody,
  manifest,
  randomExpression,
} from '/web/asset/sprite'
import PageHeader from '../PageHeader'
import Button from '../Button'
import { ArrowLeft, ArrowRight, Dices } from 'lucide-solid'
import Draggable from '../Draggable'
import Select from '../Select'
import { createDebounce, hexToRgb } from '../util'
import ColorPicker from '../ColorPicker'

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

const RATIO = 1200 / 1000

const Builder: Component<{ resize?: boolean }> = (props) => {
  let bound: HTMLElement = {} as any

  const [body, setBody] = createSignal({ ...defaultBody })
  const [base, setBase] = createSignal({ w: 500, h: 600 })
  const [diff, setDiff] = createSignal({ w: 0, h: 0 })
  const [attr, setAttr] = createSignal(attributes[0])
  const [bounds, setBounds] = createSignal({ w: 0, h: 0 })

  onMount(() => {
    const width = bound.clientWidth * 0.7
    setBase({ w: width, h: width * RATIO })
    setBounds(base())
  })

  const dragging = (x: number, y: number) => {
    setDiff({ w: x, h: y })
  }

  const dragged = (x: number, y: number) => {
    const b = base()
    setBase({ w: b.w + x, h: b.h + y })
    setDiff({ w: 0, h: 0 })
  }

  const getStyle = createMemo(() => {
    const b = base()
    const d = diff()
    const max = bounds()

    const width = b.w + d.w
    const height = b.h + d.h

    return { width: Math.min(max.w, width) + 'px', height: Math.min(max.h, height) + 'px' }
  })

  const updateAttr = (attr: SpriteAttr, type: string) => {
    setBody({ ...body(), [attr]: type })
  }

  const options = createMemo(() => {
    return (
      attributes
        .slice()
        .sort()
        // .filter((attr) => attr !== 'body')
        .map((value) => ({ label: value.replace(/_/g, ' '), value }))
    )
  })

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
      <PageHeader title="Character Builder" />
      <div class="flex select-none justify-center">
        <main class="flex w-full flex-col">
          <header class={`${styles.header} mt-2 flex w-full justify-center gap-2`}>
            <div class="flex flex-col items-center gap-2">
              <div class="flex items-center gap-1">
                <Select
                  fieldName="attribute"
                  items={options()}
                  value={attr()}
                  onChange={(value) => setAttr(value.value as any)}
                />
                <AttributeSelect attr={attr()} type={body()[attr()]} update={updateAttr} />
              </div>
              <div class="flex items-center gap-2">
                <ColorPicker
                  fieldName="color"
                  onInput={handleColor}
                  disabled={!RECOLOR[attr()]}
                  value={getAttrColor(body(), attr())}
                />

                <Button onClick={() => setBody(getRandomBody())}>
                  <Dices />
                </Button>
              </div>
            </div>
          </header>

          <section
            ref={bound!}
            class={`${styles.preview} relative h-full w-full select-none border-[1px] border-[var(--bg-900)]`}
          >
            <img src={imgs.blank} class="absolute left-0 top-0 w-full" />
            <AvatarCanvas gender="female" body={body()} style={getStyle()}></AvatarCanvas>
            {/* <Draggable onChange={dragging} onDone={dragged}></Draggable> */}
          </section>
        </main>
      </div>
    </>
  )
}

export const AvatarContainer: Component<{
  container: HTMLElement
  gender: string
  body?: SpriteBody
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

  const body = createMemo(() => props.body || getRandomBody())

  const getStyle = createMemo(() => {
    const max = bounds()

    if (max.w * RATIO < max.h) return { width: max.w + 'px', height: max.w * RATIO + 'px' }
    if (max.h / RATIO < max.w) return { width: max.h / RATIO + 'px', height: max.h + 'px' }

    return { width: max.w + 'px', height: max.h + 'px' }
  })

  return (
    <div
      ref={bound!}
      class={`${styles.preview} relative h-full w-full select-none border-[1px] border-[var(--bg-900)]`}
    >
      <img src={imgs.blank} class="absolute left-0 top-0 w-full" />
      <AvatarCanvas gender="female" body={body()} style={getStyle()}></AvatarCanvas>
      {/* <Draggable onChange={dragging} onDone={dragged}></Draggable> */}
    </div>
  )
}

export const AvatarCanvas: Component<{
  gender: string
  style: { width: string; height: string }
  children?: any
  body: SpriteBody
  class?: string
}> = (props) => {
  return (
    <>
      <For each={attributes}>
        {(attr, i) => {
          return (
            <CanvasPart
              gender={props.gender}
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
  gender: string
  attr: SpriteAttr
  type: string
  body: SpriteBody
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
      const image = asyncImage(toImage(props.gender, props.attr, props.type, file))
      promises.push(image)
    }

    const images = await Promise.all(promises)

    for (const image of images) {
      ctx.drawImage(image, 0, 0, top.width, top.height)

      // For particular attributes we will render a second re-colored image on top of the original
      const shouldColor = canColor(props.attr, image.src)
      const prop = getColorProp(props.attr)
      const color = prop ? props.body[prop] : undefined

      if (shouldColor && color) {
        const { r, g, b } = hexToRgb(color)!
        over.drawImage(image, 0, 0, top.width, top.height)
        const orig = over.globalCompositeOperation
        over.fillStyle = `rgba(${r}, ${g}, ${b}, 0.6)`
        over.globalCompositeOperation = 'source-in'
        over.fillRect(0, 0, 1000, 1200)
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
        width={1000}
        height={1200}
      ></canvas>
      <canvas
        class="absolute left-0 right-0 top-0 mx-auto"
        ref={bottom!}
        width={1000}
        height={1200}
      ></canvas>
    </>
  )
}

const AttributeSelect: Component<{
  attr: SpriteAttr
  type: string
  update: (attr: SpriteAttr, type: string) => void
}> = (props) => {
  const random = () => {
    const next = randomExpression(props.attr)
    props.update(props.attr, next)
  }

  const move = (dir: -1 | 1) => {
    const opts = manifest.attributes[props.attr]
    let curr = opts.indexOf(props.type) + dir

    if (curr < 0) curr = opts.length - 1
    if (curr >= opts.length) curr = 0

    props.update(props.attr, opts[curr])
  }

  return (
    <div class="flex gap-1">
      <Button schema="hollow" onClick={() => move(-1)}>
        <ArrowLeft size={14} />
      </Button>
      <Button schema="hollow" onClick={random}>
        <Dices size={14} />
      </Button>
      <Button schema="hollow" onClick={() => move(1)}>
        <ArrowRight size={14} />
      </Button>
    </div>
  )
}

export default Builder

function toImage(gender: string, attr: SpriteAttr, type: string, file: string) {
  const id = `${gender}-${attr}-${type}-${file}`.replace('.png', '')
  return (imgs as any)[id]
}

function asyncImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.src = src
    // image.width = ref
    // image.height = 1200

    image.onload = () => resolve(image)
    image.onerror = (ev) => reject(ev)
  })
}

function canColor(attr: SpriteAttr, file: string) {
  if (!RECOLOR[attr]) return false

  if (attr === 'body' && file.includes('skin.')) return true
  return file.includes('base.')
}

function getColorProp(attr: SpriteAttr): keyof SpriteBody | void {
  if (IS_BODY[attr]) return 'bodyColor'
  if (IS_EYES[attr]) return 'eyeColor'
  if (IS_HAIR[attr]) return 'hairColor'
}

function getHash({ body, attr, type, gender }: CanvasProps) {
  const prop = getColorProp(attr)
  const color = prop ? body[prop] : 'none'

  return `${attr}-${type}-${gender}-${color}`
}

function getAttrColor(body: SpriteBody, attr: SpriteAttr) {
  const prop = getColorProp(attr)
  if (!prop) return '#000000'

  return body[prop] || '#000000'
}
