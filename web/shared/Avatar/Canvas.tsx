import { Component, createSignal, createEffect, Suspense, Show, createResource } from 'solid-js'
import { asyncFrame, parseHex } from '../util'
import { WIDTH, HEIGHT, getColorProp } from './hooks'
import { FullSprite, SpriteAttr } from '/common/types/sprite'
import { attributes, manifest } from '/web/asset/sprite'
import { getImageData } from '/web/store/data/chars'

export { AvatarCanvas as default }

const BASE_URL = `https://agnai-assets.sgp1.digitaloceanspaces.com/sprites`
const BLANK_IMG = `${BASE_URL}/blank.png`
const CACHE_TTL_SECS = 120

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

const AvatarCanvas: Component<{
  style: { width: string; height: string }
  body: FullSprite
  class?: string
  zoom?: number
}> = (props) => {
  const [hash, setHash] = createSignal('')
  const [sprite, setSprite] = createSignal(props.body)
  const [last, setLast] = createSignal<string>()
  const [src, { refetch }] = createResource(sprite, getSpriteImage)

  createEffect(() => {
    const prev = hash()
    const next = getSpriteHash(props.body)
    if (prev === next) return

    setLast(src())
    setSprite(props.body)
    setHash(next)
    refetch(props.body)
  })

  return (
    <Suspense fallback={<img src={last() || BLANK_IMG} style={props.style} class="border-0" />}>
      <Show when={src()}>
        <img src={src()} style={props.style} class={`border-0`} />
      </Show>
    </Suspense>
  )
}

type CanvasProps = {
  attr: SpriteAttr
  type: string
  body: FullSprite
  zoom?: number
  style: { width: string; height: string }
}

function toImage(gender: string, attr: SpriteAttr, type: string, file: string) {
  const id = `${gender}-${attr}-${type}-${file}`.replace('.png', '')
  return `${BASE_URL}/${id}.png`
}

async function getSpriteImage(body: FullSprite) {
  const hash = getSpriteHash(body)
  const short = shortHash(body)

  const cached = spriteCache.get(hash)
  if (cached) {
    debug('Cache hit', short)
    const image = await cached.image
    return image
  }

  const eventual = new Promise<string>(async (resolve) => {
    debug('Cache miss', short)

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
          await asyncFrame()
          base.drawImage(image, 0, 0, WIDTH, HEIGHT)
        }

        if (color && canColor(attr, src)) {
          const base64 = await getColorLayer(src, color, recolor)
          const { image } = await asyncImageBase64(base64)
          await asyncFrame()
          base.drawImage(image, 0, 0, WIDTH, HEIGHT)
        }
      }
    }

    const fullImage = ele.toDataURL()
    resolve(fullImage)
  })

  spriteCache.set(hash, { image: eventual, ttl: Date.now() + CACHE_TTL_SECS * 1000 })
  return eventual
}

async function getColorLayer(file: string, color: string, ele?: HTMLCanvasElement) {
  if (!ele) {
    ele = document.createElement('canvas')
    ele.width = WIDTH
    ele.height = HEIGHT
  }

  const ctx = ele.getContext('2d')!

  await asyncFrame()
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
