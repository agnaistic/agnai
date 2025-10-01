import { asyncImage, getImageBase64 } from '../pages/Character/util'
import { FileInputResult } from './FileInput'

export type ResizeOptions =
  /** Set width and height specifically */
  | { type: 'dims'; w: number; h: number }
  /** Resize by multiplying each dimension by factor */
  | { type: 'percent'; factor: number }
  /** Shrink to fit - The largest dimension will be LTE max */
  | { type: 'fit'; max: number }

export async function resizeImage(image: FileInputResult, opts: ResizeOptions) {
  const base64 = await getImageBase64(image.content)
  const element = await asyncImage(base64)
  const origWidth = element.image.naturalWidth
  const origHeight = element.image.naturalHeight
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  let width = 0
  let height = 0

  switch (opts.type) {
    case 'percent': {
      width = origWidth * opts.factor
      height = origHeight * opts.factor
      break
    }

    case 'dims': {
      width = opts.w
      height = opts.h
      break
    }

    case 'fit': {
      if (origHeight <= opts.max && origWidth <= opts.max) {
        const data = await canvas.toDataURL('image/png')
        return {
          mime: 'image/png', // image.file.type,
          content: data,
          w: origWidth,
          h: origHeight,
          original: { ...image, w: origWidth, h: origHeight },
        }
      }

      const factor = origHeight > origWidth ? opts.max / origHeight : opts.max / origWidth
      width = origWidth * factor
      height = origHeight * factor
      break
    }
  }

  width = Math.floor(width)
  height = Math.floor(height)

  element.image.width
  element.image.height
  canvas.width = width
  canvas.height = height

  ctx?.drawImage(element.image, 0, 0, width, height)

  const data = canvas.toDataURL('image/png') // previously: image.file.type
  return {
    mime: 'image/png', // image.file.type,
    content: data,
    w: width,
    h: height,
    original: { ...image, w: origWidth, h: origHeight },
  }
}
