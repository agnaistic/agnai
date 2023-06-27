type EmotionMap = { [key in SpriteAttr]?: string }

type SpriteEmote = Record<string, EmotionMap>

export type EmoteType = keyof typeof emotions

export const eyes = {
  wide_open: 'neutral_8',
  bored: 'neutral_10',
  tired: 'neutral_6',
  asleep: 'closed_3',
}

export const emotions = {
  neutral: {
    eyes: 'neutral',
    mouths: 'neutral',
    eyebrows: 'neutral',
  },
  annoyed: {
    eyes: 'neutral',
    mouths: 'annoyed',
    eyebrows: 'angry',
  },
  sad: {
    eyes: 'crying',
    eyebrows: 'sad',
    mouths: 'frown',
  },
  angry: {
    eyes: 'neutral_5',
    mouths: 'annoyed',
    eyebrows: 'angry',
  },
  surprised: {
    eyes: 'surprised',
    eyebrows: 'surprised',
    mouths: 'open_mouth',
  },
  laughing: {
    eyes: 'closed',
    eyebrows: 'surprised',
    mouths: 'laugh',
  },
  happy: {
    eyes: 'neutral',
    eyebrows: 'surprised',
    mouths: 'closed_smile',
  },
  excited: {
    eyes: 'neutral',
    eyebrows: 'surprised',
    mouths: 'open_smile',
  },
  joy: {
    eyes: 'neutral',
    eyebrows: 'surprised',
    mouths: 'open_smile',
  },
  blink: {
    eyes: 'closed',
    eyebrows: 'neutral',
    mouths: 'neutral',
  },
} satisfies SpriteEmote

export const classifyEmotes = Object.keys(emotions).filter(
  (emote) => emote !== 'blink'
) as EmoteType[]

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

export type SpriteBody = Record<SpriteAttr, string>

export type FullSprite = SpriteBody & {
  /** Hex. E.g. #ffffff */
  eyeColor?: string

  /** Hex. E.g. #ffffff */
  bodyColor?: string

  /** Hex. E.g. #ffffff */
  hairColor?: string

  gender: 'male' | 'female'
}
