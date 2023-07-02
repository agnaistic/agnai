import { Component, For, createSignal, createMemo, createEffect, Show, onMount } from 'solid-js'
import { parseHex } from '../util'
import { WIDTH, HEIGHT, Y_OFFSET, getColorProp } from './hooks'
import { FullSprite, SpriteAttr } from '/common/types/sprite'
import { attributes, manifest } from '/web/asset/sprite'
import { getImageData } from '/web/store/data/chars'

const BASE_URL = `https://agnai-assets.sgp1.digitaloceanspaces.com/sprites`
const BLANK_IMG = `${BASE_URL}/blank.png`
const CACHE_TTL_SECS = 60

type ImageFilename = string
const oneImageCache = new Map<ImageFilename, string>()

type SpriteHash = string
const spriteCache = new Map<SpriteHash, { image: Promise<string>; ttl: number }>()

setInterval(() => {
  const threshold = Date.now()
  let cleared = 0
  for (const [key, entry] of spriteCache.entries()) {
    if (threshold < entry.ttl) continue
    cleared++
    spriteCache.delete(key)
  }
  if (cleared > 0) debug('Cleared', cleared)
}, 500)

const RECOLOR: { [key in SpriteAttr]?: boolean } = {
  eyes: true,
  body: true,
  back_hair: true,
  front_hair: true,
  eye_cover_hair: true,
}

export const AvatarCanvasV2: Component<{
  style: { width: string; height: string }
  body: FullSprite
  class?: string
  zoom?: number
}> = (props) => {
  let img: HTMLImageElement
  const [hash, setHash] = createSignal<string>()

  const loadSprite = async () => {
    const prev = hash()
    const id = getSpriteHash(props.body)
    const short = shortHash(props.body)
    if (prev === id) return

    const cached = spriteCache.get(id)
    if (cached) {
      debug('Cache hit', short)
      img.src = await cached.image
      setHash(id)
      return
    }

    debug('Cache miss', short)
    const eventualSprite = new Promise<string>(async (resolve) => {
      try {
        const full = await getSpriteImage(props.body)
        img.src = full
        setHash(id)
        resolve(full)
      } catch (ex) {
        resolve('')
      }
    })

    spriteCache.set(id, { image: eventualSprite, ttl: Date.now() + CACHE_TTL_SECS * 1000 })
  }

  onMount(loadSprite)

  createEffect(loadSprite)

  return (
    <>
      <img ref={img!} style={props.style} />
    </>
  )
}

const AvatarCanvas: Component<{
  style: { width: string; height: string }
  children?: any
  body: FullSprite
  class?: string
  zoom?: number
}> = (props) => {
  onMount(async () => {})

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

async function getSpriteImage(body: FullSprite) {
  const { ctx: base, ele } = createCanvas()
  const { ele: recolor } = createCanvas()

  for (const attr of attributes) {
    const files = manifest[attr][body[attr]]
    if (!files) continue

    const prop = getColorProp(attr)
    const color = prop ? body[prop] : undefined

    for (const file of files) {
      const src = toImage(body.gender, attr, body[attr], file)

      {
        const { image } = await asyncImage(src)
        base.drawImage(image, 0, 0, WIDTH, HEIGHT)
      }

      if (color && canColor(attr, src)) {
        const base64 = await getColorLayer(src, color, recolor)
        const { image } = await asyncImageBase64(base64)
        base.drawImage(image, 0, 0, WIDTH, HEIGHT)
      }
    }
  }

  const fullImage = ele.toDataURL()
  return fullImage
}

async function getColorLayer(file: string, color: string, ele?: HTMLCanvasElement) {
  if (!ele) {
    ele = document.createElement('canvas')
    ele.width = WIDTH
    ele.height = HEIGHT
  }

  const ctx = ele.getContext('2d')!

  // Ensure the canvas is clean and has the correct settings
  ctx.imageSmoothingEnabled = false
  ctx.imageSmoothingQuality = 'low'
  ctx.clearRect(0, 0, WIDTH, HEIGHT)

  const { image } = await asyncImage(file)

  ctx.globalCompositeOperation = 'source-over'
  ctx.drawImage(image, 0, 0, WIDTH, HEIGHT)

  const { r, g, b, alpha = 0.5 } = parseHex(color)
  ctx.globalCompositeOperation = 'source-in'
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  const base64 = ele.toDataURL()
  return base64
}

function createCanvas() {
  const ele = document.createElement('canvas')
  ele.width = WIDTH
  ele.height = HEIGHT

  const ctx = ele.getContext('2d')!

  return { ele, ctx }
}

async function getImageBase64(src: string) {
  const data = oneImageCache.get(src)
  if (data) return data

  const blob = await fetch(src)
    .then((res) => {
      if (res.status >= 400) throw new Error(res.statusText)
      return res.blob()
    })
    .catch((err) => ({ err }))

  if ('err' in blob) throw new Error(`Failed to get Sprite image: ${blob.err.message || blob.err}`)

  const base64 = await getImageData(blob)
  oneImageCache.set(src, base64!)
  return base64!
}

function asyncImage(src: string) {
  return new Promise<{ name: string; image: HTMLImageElement }>(async (resolve, reject) => {
    const data = await getImageBase64(src)
    const image = new Image()
    image.src = data

    image.onload = () => resolve({ name: src, image })
    image.onerror = (ev) => reject(ev)
  })
}

function asyncImageBase64(base64: string) {
  return new Promise<{ name: string; image: HTMLImageElement }>(async (resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve({ name: 'base64', image })
    image.onerror = (ev) => {
      console.error(ev)
      reject(ev)
    }
    image.src = base64
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

function getHash({ body, attr, type }: Pick<CanvasProps, 'body' | 'attr' | 'type'>) {
  const prop = getColorProp(attr)
  const color = prop ? body[prop] : 'none'

  return `${attr}-${type}-${body.gender}-${color}`
}

function getSpriteHash(body: FullSprite) {
  const colorHash = `-color(${body.bodyColor || 'none'}-${body.eyeColor || 'none'}-${
    body.hairColor || 'none'
  })`
  const hash = attributes
    .map((attr) => {
      const part = getHash({ body, attr, type: body[attr] })
      return part
    })
    .join('-')
  return `${hash}-${colorHash}`
}

function shortHash(body: FullSprite) {
  const colorHash = `-color(${body.bodyColor || 'none'}-${body.eyeColor || 'none'}-${
    body.hairColor || 'none'
  })`
  const hash = attributes
    .map((attr) => {
      const h = `${attr}:${body[attr]}`
      return h
    })
    .join('__')
  return `${hash}__${colorHash}`
}

function debug(...args: any[]) {
  console.debug(...args)
}
