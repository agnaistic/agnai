export type SpriteAttr =
  | 'accessories'
  | 'back_hair'
  | 'blushes'
  | 'body'
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
