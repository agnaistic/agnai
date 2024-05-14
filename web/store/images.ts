import * as lf from 'localforage'
import { v4 } from 'uuid'
import { imageApi } from './data/image'

const store = lf.createInstance({ name: `agnai-images` })

type ImageReel = {
  id: string

  addImage(base64: string, id?: string): Promise<string[]>
  removeImage(imageId: string): Promise<string[]>
  getImage(imageId: string): Promise<string | undefined>
  getImageIds(): Promise<string[]>
  removeAll(): Promise<string[]>
}

export function createImageCache(collection: string): ImageReel {
  return {
    id: collection,
    getImageIds: () => getImageIds(collection),
    addImage: (base64, id) => addImage(collection, base64, id),
    getImage: (imageId) => getImage(collection, imageId),
    removeImage: (imageId) => removeImage(collection, imageId),
    removeAll: () => removeAll(collection),
  }
}

async function getImageIds(collection: string): Promise<string[]> {
  const json = await store.getItem(`${collection}_images`)
  if (!json) return []

  const ids = JSON.parse(json as string)

  return ids as string[]
}

async function addImage(collection: string, image: string, id?: string): Promise<string[]> {
  const imageId = `${collection}-${id ?? v4().slice(0, 5)}`

  if (!image.startsWith('data:')) {
    image = (await imageApi.getImageData(image)) || image
  }

  await store.setItem(imageId, image)
  const ids = await getImageIds(collection).then((images) => images.filter((id) => id !== imageId))

  ids.push(imageId)
  return saveImageIds(collection, ids)
}

async function getImage(collection: string, imageId: string): Promise<string | undefined> {
  const id = imageId.startsWith(`${collection}-`) ? imageId : `${collection}-${imageId}`
  const image = await store.getItem(id)
  if (!image) return

  return image as string
}

async function removeImage(collection: string, imageId: string): Promise<string[]> {
  await store.removeItem(`${collection}-${imageId}`)
  const ids = await getImageIds(collection)
  const next = ids.filter((id) => id !== imageId)
  return saveImageIds(collection, next)
}

async function removeAll(collection: string) {
  const ids = await getImageIds(collection)

  for (const id of ids) {
    await store.removeItem(`${collection}-${id}`)
  }

  return saveImageIds(collection, [])
}

async function saveImageIds(collection: string, ids: string[]) {
  await store.setItem(`${collection}_images`, JSON.stringify(ids))
  return ids
}
