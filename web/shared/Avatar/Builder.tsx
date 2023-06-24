import imgs from '../../asset/sprites/images/*.png'
import styles from './avatar.module.scss'
import { Component, For, JSX, createEffect, createMemo, createSignal, onMount } from 'solid-js'
import PageHeader from '../PageHeader'
import {
  SpriteAttr,
  SpriteBody,
  attributes,
  defaultBody,
  getRandomBody,
  manifest,
  randomExpression,
} from '/web/asset/sprite'
import Button from '../Button'
import { ArrowLeft, ArrowRight, Dices, Move, MoveDiagonal2 } from 'lucide-solid'
import Draggable from '../Draggable'
import Select from '../Select'

const Builder: Component<{ resize?: boolean }> = (props) => {
  let bound: any
  const [body, setBody] = createSignal({ ...defaultBody })
  const [base, setBase] = createSignal({ w: 240, h: 288 })
  const [diff, setDiff] = createSignal({ w: 0, h: 0 })
  const [attr, setAttr] = createSignal(attributes[0])

  const dragging = (x: number, y: number) => {
    setDiff({ w: x, h: y })
  }

  const dragged = (x: number, y: number) => {
    const b = base()
    setBase({ w: b.w + x, h: b.h + y })
    setDiff({ w: 0, h: 0 })
  }

  const getStyle = () => {
    const b = base()
    const d = diff()

    const width = b.w + d.w
    const height = b.h + d.h

    return { width: width + 'px', height: height + 'px' }
  }

  onMount(() => {
    setBase({ w: bound.offsetWidth, h: bound.offsetHeight })
  })

  const updateAttr = (attr: SpriteAttr, type: string) => {
    console.log(attr, '--->', type)
    setBody({ ...body(), [attr]: type })
  }

  const options = createMemo(() => {
    return (
      attributes
        // .filter((attr) => manifest.attributes[attr].length > 1)
        .map((value) => ({ label: value.replace(/_/g, ' '), value }))
    )
  })

  return (
    <>
      <PageHeader title="Character Builder" />
      <div class="flex w-full select-none justify-center">
        <main class={styles.main}>
          <header class={`flex w-full items-center justify-center ${styles.header}`}>
            Character builder
          </header>
          <section class={styles.left}>
            <AttributeSelect attr="mouths" type={body().mouths} update={updateAttr} />
          </section>

          <section ref={bound} class={styles.preview}>
            {/* <FullBody gender="female" body={body()} style={getStyle()}>
              <div class="absolute left-0 top-0">
                <Move />
              </div>
              <div class="absolute bottom-0 right-0">
                <Draggable onChange={dragging} onDone={dragged}>
                  <MoveDiagonal2 />
                </Draggable>
              </div>
            </FullBody> */}
            <BodyCanvas gender="female" body={body()} style={getStyle()}>
              <div class="absolute left-0 top-0">
                <Move />
              </div>
              <div class="absolute bottom-0 right-0">
                <Draggable onChange={dragging} onDone={dragged}>
                  <MoveDiagonal2 />
                </Draggable>
              </div>
            </BodyCanvas>
          </section>

          <section class={styles.right}>Right</section>
          <footer class={`${styles.footer} mt-2 flex w-full justify-center gap-2`}>
            <div class="flex flex-col items-center gap-2">
              <AttributeSelect attr={attr()} type={body()[attr()]} update={updateAttr} />
              <div class="flex gap-2">
                <Select
                  fieldName="attribute"
                  items={options()}
                  value={attr()}
                  onChange={(value) => setAttr(value.value as any)}
                />
                <Button onClick={() => setBody(getRandomBody())}>
                  <Dices />
                </Button>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </>
  )
}

const FullBody: Component<{
  gender: string
  style: { width: string; height: string }
  children?: any
  body: SpriteBody
}> = (props) => {
  return (
    <div
      class="relative h-72 w-60 select-none border-[1px] border-[var(--bg-900)]"
      style={props.style}
    >
      <For each={attributes}>
        {(attr) => <Attribute gender={props.gender} attr={attr} type={props.body[attr]} />}
      </For>
      {props.children}
    </div>
  )
}

const BodyCanvas: Component<{
  gender: string
  style: { width: string; height: string }
  children?: any
  body: SpriteBody
}> = (props) => {
  let ref: HTMLCanvasElement

  // const [elems, setElems] = createSignal<HTMLImageElement[]>([])

  // createEffect(() => {
  //   ref.style.width = props.style.width
  //   ref.style.height = props.style.height
  // })

  // createEffect(async () => {
  //   const ctx = ref.getContext('2d')
  //   if (!ctx) return
  //   ctx.clearRect(0, 0, ref.width, ref.height)
  //   ctx.imageSmoothingEnabled = false
  //   ctx.imageSmoothingQuality = 'high'

  //   const promises: Array<Promise<HTMLImageElement>> = []

  //   for (const attr of attributes) {
  //     const type = props.body[attr]
  //     if (type === 'none') continue

  //     for (const file of manifest[attr][type]) {
  //       const image = asyncImage(toImage(props.gender, attr, type, file))
  //       promises.push(image)
  //     }
  //   }

  //   const images = await Promise.all(promises)
  //   setElems(images)
  //   for (const image of images) {
  //     ctx.drawImage(image, 0, 0, ref.width, ref.height)
  //     if (image.src.includes('eye_cover_hair')) {
  //       const orig = ctx.globalCompositeOperation
  //       ctx.globalCompositeOperation = 'source-in'
  //       ctx.fillStyle = 'red'
  //       ctx.fillRect(0, 0, 1000, 1200)
  //       ctx.fillStyle = ''
  //       ctx.globalCompositeOperation = orig

  //       ctx

  //       // image.ctx.fillStyle = color
  //       // image.ctx.globalCompositeOperation = 'color'
  //       // image.ctx.fillRect(0, 0, image.width, image.height)
  //       // image.ctx.globalCompositeOperation = ''
  //     }
  //   }
  // })

  return (
    <div
      class="relative h-72 w-60 select-none border-[1px] border-[var(--bg-900)]"
      style={props.style}
    >
      <For each={Object.entries(props.body)}>
        {([attr, type], i) => {
          return (
            <CanvasPart
              gender={props.gender}
              attr={attr as any}
              type={type}
              style={props.style}
              color={'red'}
            />
          )
        }}
      </For>
      {/* <canvas ref={ref!} width={1000} height={1200}></canvas> */}
      {props.children}
    </div>
  )
}

const CanvasPart: Component<{
  gender: string
  attr: SpriteAttr
  type: string
  color?: string
  style: { width: string; height: string }
}> = (props) => {
  let top: HTMLCanvasElement
  let bottom: HTMLCanvasElement

  createEffect(() => {
    top.style.width = props.style.width
    top.style.height = props.style.height
    bottom.style.width = props.style.width
    bottom.style.height = props.style.height
  })

  createEffect(async () => {
    if (props.type === 'none') return
    const ctx = top.getContext('2d')
    const over = bottom.getContext('2d')
    if (!ctx || !over) return

    const promises: Array<Promise<HTMLImageElement>> = []

    for (const file of manifest[props.attr][props.type]) {
      const image = asyncImage(toImage(props.gender, props.attr, props.type, file))
      promises.push(image)
    }

    const images = await Promise.all(promises)

    for (const image of images) {
      ctx.drawImage(image, 0, 0, top.width, top.height)

      if (image.src.includes('cover_hair') && image.src.includes('base.')) {
        over.drawImage(image, 0, 0, top.width, top.height)
        const orig = over.globalCompositeOperation
        over.fillStyle = 'rgba(255,0,0, 0.5)'
        over.globalCompositeOperation = 'source-in'
        over.fillRect(0, 0, 1000, 1200)
        // ctx.globalCompositeOperation = 'source-in'
        // ctx.globalCompositeOperation = 'source-over'
        // ctx.drawImage(image, 0, 0)
        // ctx.globalCompositeOperation = 'source-over'
        over.fillStyle = ''
        over.globalCompositeOperation = orig
        // ctx
        // image.ctx.fillStyle = color
        // image.ctx.globalCompositeOperation = 'color'
        // image.ctx.fillRect(0, 0, image.width, image.height)
        // image.ctx.globalCompositeOperation = ''
      }
      // ctx.drawImage(image, 0, 0, ref.width, ref.height)
    }
  })

  return (
    <>
      <canvas class="absolute left-0 top-0" ref={top!} width={1000} height={1200}></canvas>
      <canvas class="absolute left-0 top-0" ref={bottom!} width={1000} height={1200}></canvas>
    </>
  )
}

const Attribute: Component<{
  gender: string
  attr: SpriteAttr
  type: string
  ready?: (state: boolean) => void
}> = (props) => {
  const images = createMemo(() => {
    if (!props.type || props.type === 'none') return []

    const names = manifest[props.attr][props.type]
    return names.map((file) => toImage(props.gender, props.attr, props.type, file))
  })

  return (
    <>
      <For each={images()}>
        {(src, i) => <img class="absolute left-0 top-0 h-full w-full" src={src} />}
      </For>
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
    const opts = manifest.attributes[props.attr].concat('none')
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
      <Button schema="hollow">
        <Dices size={14} onClick={random} />
      </Button>
      <Button schema="hollow">
        <ArrowRight size={14} onClick={() => move(1)} />
      </Button>
    </div>
  )
}

// const Sect: Component<{ gender: string; attr: SpriteAttr; type: string }> = (props) => {
//   const images = createMemo(() => manifest[props.attr][props.type])

//   return (
//     <>
//       <For each={images()}>
//         {(img) => (
//           <img
//             class="absolute left-0 top-0"
//             src={toImage(props.gender, props.attr, props.type, img)}
//           />
//         )}
//       </For>
//     </>
//   )
// }

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

function imageToCanvas(image: HTMLImageElement) {
  const c = document.createElement('canvas')
  c.width = image.naturalWidth
  c.height = image.naturalHeight
  const context = c.getContext('2d')!
  context.drawImage(image, 0, 0)

  //restore
  context.clearRect(0, 0, image.width, image.height)
  context.drawImage(image, 0, 0)

  return { canvas: c, context }
}
