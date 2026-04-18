import { v4 } from 'uuid'
import { imageApi } from './data/image'
import { storage } from '../shared/util'
import { ImageCacheHook } from '../shared/hooks'
import { ButtonSchema } from '../shared/Button'
import { createStore } from './create'
import { debug } from '/common/debug'

const log = debug('image-cache')

export type ImageState = {
  showImgSettings: boolean
  preview?: { file: File; base64: string; percent: number }
  signal?: AbortController

  imggen: {
    show: boolean
    prompt?: string
    action?: {
      text: string
      handler: (image: string) => void
    }
  }

  showImage?: {
    src: ImageSource
    options: ImageButton[]
    onClose?: () => void
  }
}

export type ImageSource = {
  type: 'collection' | 'url' | 'message'
  messageId?: string
  id: string
  initial?: number
  prompt?: string
}

export type ImageButton = {
  schema: ButtonSchema
  text: string
  onClick: (ents?: { reel: ImageCacheHook; prompt: string }) => void
}

export const imageStore = createStore<ImageState>('image', {
  imggen: { show: false },
  showImgSettings: false,
})(() => {
  return {
    openImageGen: (_, opts?: { prompt?: string; handler?: ImageButton; collectionId?: string }) => {
      return {
        showImage: {
          options: opts?.handler ? [opts.handler] : [],
          src: {
            type: 'collection',
            id: opts?.collectionId || '', // No ID = ephemeral
            initial: 0,
            prompt: opts?.prompt || '',
          },
        },
      }
    },
    closeImageGen: () => {
      return { showImage: undefined }
    },
    imageSettings({ showImgSettings }, next?: boolean) {
      if (next === undefined) {
        return { showImgSettings: !showImgSettings }
      }

      return { showImgSettings: next }
    },
    showImage(_, opts: { src: ImageSource; actions?: ImageButton[]; onClose?: () => void }) {
      return { showImage: { src: opts.src, options: opts.actions || [], onClose: opts.onClose } }
    },
    showMessageImages(prev, opts: { id: string; position?: number }) {
      if (prev.showImage) return

      return {
        showImage: {
          src: {
            type: 'message',
            id: `message-images-${opts.id}`,
            initial: opts.position,
            messageId: opts.id,
          },
          options: [],
        },
      }
    },
    clearImage() {
      return { showImage: undefined }
    },
  }
})

// const store = lf.createInstance({ name: `agnai-images` })

type ImageMeta = { id?: string; prompt?: string }

export type ImageReel = {
  id: string

  addImage(base64: string, meta?: ImageMeta): Promise<{ ids: string[]; cacheId: string }>
  removeImage(imageId: string): Promise<string[]>
  getImage(imageId: string): Promise<string | undefined>
  getImageIds(): Promise<string[]>
  removeAll(): Promise<string[]>
}

export function createImageCache(collection: string): ImageReel {
  const body: ImageReel = {
    id: collection,
    getImageIds: () => getImageIds(body.id),
    addImage: (base64, id) => addImage(body.id, base64, id),
    getImage: (imageId) => getImage(body.id, imageId),
    removeImage: (imageId) => removeImage(body.id, imageId),
    removeAll: () => removeAll(body.id),
  }

  return body
}

async function getImageIds(collection: string): Promise<string[]> {
  log(`loading %s`, collection.slice(0, 20) + '...')
  const json = (await storage.getItem(`${collection}`)) || JSON.stringify([])

  const ids = JSON.parse(json as string) as string[]
  log(`loaded %s: %s`, collection.slice(0, 20) + '...', ids.length)
  return ids
}

async function addImage(
  collection: string,
  image: string,
  meta?: ImageMeta
): Promise<{ ids: string[]; cacheId: string }> {
  const cacheId = `cache:${meta?.id || v4()}`

  if (!image.startsWith('data:')) {
    image = (await imageApi.getImageData(image)) || image
  }

  await storage.setItem(cacheId, image)
  const ids = await getImageIds(collection).then((images) => images.filter((id) => id !== cacheId))

  ids.push(cacheId)
  const nextIds = await saveImageIds(collection, ids)
  return { ids: nextIds, cacheId: cacheId }
}

async function getImage(collection: string, imageId: string): Promise<string | undefined> {
  if (!imageId) return
  if (imageId.startsWith('cache:')) {
    const image = await storage.getItem(imageId)
    if (image) return image
  }

  const id = imageId.startsWith(`${collection}-`) ? imageId : `${collection}-${imageId}`
  const image = await storage.getItem(id)
  if (!image) return

  return image as string
}

async function removeImage(collection: string, imageId: string): Promise<string[]> {
  if (imageId.startsWith('cache:')) {
    await storage.removeItem(imageId)
  }

  await storage.removeItem(`${collection}-${imageId}`)
  const ids = await getImageIds(collection)
  const next = ids.filter((id) => id !== imageId)
  return saveImageIds(collection, next)
}

async function removeAll(collection: string) {
  const ids = await getImageIds(collection)

  for (const id of ids) {
    await storage.removeItem(`${collection}-${id}`)
  }

  return saveImageIds(collection, [])
}

async function saveImageIds(collection: string, ids: string[]) {
  await storage.setItem(`${collection}`, JSON.stringify(ids))
  log(`saved ${collection.slice(0, 2)}: ${ids.length}`)
  return ids
}
