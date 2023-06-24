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

const empty = new Set<SpriteAttr>([
  'eye_cover_hair',
  'blushes',
  'glasses',
  'accessories',
  'headbands',
  'freckles',
  'headphones_base',
])

for (const attr of attributes) {
  if (!empty.has(attr)) continue
  manifest.attributes[attr].push('none')
}

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

export type SpriteBody = Record<SpriteAttr, string> & {
  /** Hex. E.g. #ffffff */
  eyeColor?: string

  /** Hex. E.g. #ffffff */
  bodyColor?: string

  /** Hex. E.g. #ffffff */
  hairColor?: string
}

export const defaultBody = getRandomBody()

export function randomExpression(attr: SpriteAttr) {
  const idx = Math.floor(Math.random() * manifest.attributes[attr].length)
  return manifest.attributes[attr][idx]
}

type Manifest = {
  attributes: Record<SpriteAttr, string[]>
} & { [key in SpriteAttr]: Record<string, string[]> }

export function getRandomBody() {
  const body = attributes.reduce((prev, curr) => {
    const rand = randomExpression(curr)
    return Object.assign(prev, { [curr]: rand })
  }, {}) as SpriteBody

  body.bodyColor = '#ecab6f'
  body.eyeColor = randomHex()
  body.hairColor = randomHex()

  return body
}

function randomHex() {
  const values = Array.from({ length: 6 }, (v) => Math.floor(Math.random() * 16))
    .map((v) => v.toString(16))
    .join('')
  return '#' + values
}
