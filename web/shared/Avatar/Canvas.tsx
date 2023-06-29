import { Component, For, createSignal, createMemo, createEffect, Show } from 'solid-js'
import { parseHex } from '../util'
import { WIDTH, HEIGHT, Y_OFFSET, getColorProp } from './hooks'
import { FullSprite, SpriteAttr } from '/common/types/sprite'
import { attributes, manifest } from '/web/asset/sprite'
import { getImageData } from '/web/store/data/chars'

const BASE_URL = `https://agnai-assets.sgp1.digitaloceanspaces.com/sprites`
const BLANK_IMG = `${BASE_URL}/blank.png`

const imageCache = new Map<string, string>()

const RECOLOR: { [key in SpriteAttr]?: boolean } = {
  eyes: true,
  body: true,
  back_hair: true,
  front_hair: true,
  eye_cover_hair: true,
}

const AvatarCanvas: Component<{
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

export default AvatarCanvas

type CanvasProps = {
  attr: SpriteAttr
  type: string
  body: FullSprite
  zoom?: number
  style: { width: string; height: string }
}

const CanvasPart: Component<CanvasProps> = (props) => {
  let base: HTMLCanvasElement
  let shader: HTMLCanvasElement

  const [state, setState] = createSignal('')

  const recolored = createMemo(() => {
    const prop = getColorProp(props.attr)
    if (!prop) return false
    if (!props.body[prop]) return false
    return true
  })

  createEffect(() => {
    if (!base || !shader) return

    base.style.width = props.style.width
    base.style.height = props.style.height
    shader.style.width = props.style.width
    shader.style.height = props.style.height
  })

  const baseImages = createMemo(() => {
    const files = manifest[props.attr][props.type] || []
    const images = files
      .filter((file) => {
        // if (props.attr === 'back_hair') return false
        // if (props.attr.includes('hair') && file.includes('highlight')) return false
        return true
      })
      .map((id) => toImage(props.body.gender, props.attr, props.type, id))
    return images
  })

  createEffect(async () => {
    const prop = getColorProp(props.attr)
    const color = prop ? props.body[prop] : false

    if (!color) {
      return
    }

    if (!shader) {
      return
    }

    const hash = getHash(props)
    if (hash === state()) return

    setState(hash)

    const over = shader.getContext('2d')!
    const under = base.getContext('2d')!

    under.imageSmoothingEnabled = true
    under.imageSmoothingQuality = 'high'
    over.imageSmoothingEnabled = true
    over.imageSmoothingQuality = 'high'
    under.clearRect(0, 0, WIDTH, HEIGHT)
    over.clearRect(0, 0, WIDTH, HEIGHT)

    if (!props.type || props.type === 'none') return

    const promises: Array<Promise<{ name: string; image: HTMLImageElement }>> = []

    for (const name of baseImages()) {
      const image = asyncImage(name)
      promises.push(image)
    }

    const images = await Promise.allSettled(promises)

    for (const result of images) {
      if (result.status !== 'fulfilled') continue
      under.drawImage(result.value.image, 0, 0, WIDTH, HEIGHT)

      if (canColor(props.attr, result.value.name)) {
        over.drawImage(result.value.image, 0, 0, WIDTH, HEIGHT - Y_OFFSET)
      }
    }

    const { r, g, b, alpha = 0.5 } = parseHex(color)!
    over.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
    over.globalCompositeOperation = 'source-in'
    over.fillRect(0, 0, WIDTH, HEIGHT)
  })

  return (
    <>
      <Show when={!recolored()}>
        <For each={baseImages()}>
          {(src) => (
            <img
              class="absolute left-0 right-0 top-0 mx-auto"
              src={src}
              style={{ ...props.style, transform: `scale(${props.zoom || 1})` }}
              onError={(ev) => {
                ev.currentTarget.src = BLANK_IMG
              }}
            />
          )}
        </For>
      </Show>
      <Show when={recolored()}>
        <canvas
          class="absolute left-0 right-0 top-0 mx-auto"
          ref={base!}
          width={WIDTH}
          height={HEIGHT - Y_OFFSET}
          // style={props.style}
          style={{ ...props.style, transform: `scale(${props.zoom})` }}
        ></canvas>
        <canvas
          class="absolute left-0 right-0 top-0 mx-auto"
          ref={shader!}
          width={WIDTH}
          height={HEIGHT - Y_OFFSET}
          // style={props.style}
          style={{ ...props.style, transform: `scale(${props.zoom})` }}
        ></canvas>
      </Show>
    </>
  )
}

function toImage(gender: string, attr: SpriteAttr, type: string, file: string) {
  const id = `${gender}-${attr}-${type}-${file}`.replace('.png', '')
  return `${BASE_URL}/${id}.png`
}

function asyncImage(src: string) {
  return new Promise<{ name: string; image: HTMLImageElement }>(async (resolve, reject) => {
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

    image.onload = () => resolve({ name: src, image })
    image.onerror = (ev) => reject(ev)
  })
}

function canColor(attr: SpriteAttr, file: string) {
  if (!RECOLOR[attr]) return false

  if (attr === 'body' && file.includes('skin.')) return true
  if (attr === 'front_hair') {
    return file.includes('base.')
  }
  return file.includes('base.')
}

function getHash({ body, attr, type }: CanvasProps) {
  const prop = getColorProp(attr)
  const color = prop ? body[prop] : 'none'

  return `${attr}-${type}-${body.gender}-${color}`
}
