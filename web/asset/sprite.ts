export const manifest = require('./sprites/manifest.json') as Manifest

export const attributes: SpriteAttr[] = [
  'back_hair',
  'body',
  'freckles',
  'blushes',
  'outfits',
  'neck',
  'headphones_base',
  'front_hair',
  'eyes',
  'eyebrows',
  'mouths',
  'glasses',
  'eye_cover_hair',
  'headbands',
  'accessories',
]

export type SpriteAttr =
  | 'accessories'
  | 'back_hair'
  | 'blushes'
  | 'body'
  | 'outfits'
  | 'eye_cover_hair'
  | 'eyebrows'
  | 'eyes'
  | 'freckles'
  | 'front_hair'
  | 'glasses'
  | 'headbands'
  | 'headphones_base'
  | 'mouths'
  | 'neck'

export type SpriteId = 'male' | 'female'

export type SpriteEmote = 'shock' | 'annoy' | 'neutral' | 'content' | 'happy' | 'laugh' | 'unhappy'

export const emoteMap: Record<SpriteEmote, string> = {
  annoy: 'annoyed',
  content: 'closed_smile',
  unhappy: 'frown',
  shock: 'open_mouth',
  happy: 'open_smile',
  laugh: 'laugh',
  neutral: 'neutral',
}

export type SpriteBody = Record<SpriteAttr, string>

export const defaultBody = attributes.reduce((prev, curr) => {
  const rand = randomExpression(curr)
  return Object.assign(prev, { [curr]: rand })
}, {}) as SpriteBody

console.log(defaultBody)

export function randomExpression(attr: SpriteAttr) {
  const idx = Math.floor(Math.random() * manifest.attributes[attr].length)
  return manifest.attributes[attr][idx]
}

type Manifest = {
  attributes: Record<SpriteAttr, string>
} & { [key in SpriteAttr]: Record<string, string[]> }

export function getRandomBody() {
  const body = attributes.reduce((prev, curr) => {
    const rand = randomExpression(curr)
    return Object.assign(prev, { [curr]: rand })
  }, {}) as SpriteBody

  return body
}
