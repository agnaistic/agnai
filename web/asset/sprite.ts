import { EmoteType, FullSprite, SpriteAttr, SpriteBody, emotions } from '/common/types/sprite'

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
  'freckles',
  'neck',
  'back_hair',
  'front_hair',
  'eyebrows',
])

for (const attr of attributes) {
  if (!empty.has(attr)) continue
  manifest.attributes[attr].push('none')
}

export const defaultBody = getRandomBody()

export function randomExpression(attr: SpriteAttr) {
  const idx = Math.floor(Math.random() * manifest.attributes[attr].length)
  return manifest.attributes[attr][idx]
}

export function getEmoteExpressions(main: FullSprite, emote: EmoteType): Partial<SpriteBody> {
  const body: Partial<SpriteBody> = {}
  const keys = Object.entries(emotions[emote]) as any as Array<[SpriteAttr, string]>

  for (const [attr, subtype] of keys) {
    if (emote === 'neutral') {
      body[attr] = main[attr]
      continue
    }

    const alltypes = manifest.attributes[attr]
    const matches = alltypes.filter((t) => t.startsWith(subtype))

    if (!matches.length) body[attr] = randomElement(alltypes)
    else body[attr] = randomElement(matches)
  }

  return body
}

type Manifest = {
  attributes: Record<SpriteAttr, string[]>
} & { [key in SpriteAttr]: Record<string, string[]> }

export function getRandomBody(retain: Partial<FullSprite> = {}) {
  const body = attributes.reduce((prev, curr) => {
    const rand = randomExpression(curr)
    return Object.assign(prev, { [curr]: rand })
  }, {}) as FullSprite

  body.bodyColor = '#ecab6f'
  body.eyeColor = randomHex()
  body.hairColor = randomHex()
  body.gender = randomElement(['male', 'female'])

  return {
    ...body,
    ...getEmoteExpressions(body, 'neutral'),
    ...retain,
  }
}

function randomHex() {
  const values = Array.from({ length: 6 }, (v) => Math.floor(Math.random() * 16))
    .map((v) => v.toString(16))
    .join('')
  return '#' + values
}

function randomElement<T>(elems: T[]) {
  const rand = Math.floor(Math.random() * elems.length)
  return elems[rand]
}
