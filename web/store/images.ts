import { v4 } from 'uuid'
import { imageApi } from './data/image'
import { storage } from '../shared/util'

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
  console.log(`[img-cache] loading ${collection}`)
  const json = await storage.getItem(`${collection}`)
  if (!json) return []

  const ids = JSON.parse(json as string)

  return ids as string[]
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
  return ids
}
