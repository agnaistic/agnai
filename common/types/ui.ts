export const BG_THEME = ['truegray', 'coolgray', 'bluegray'] as const

export const UI_FONT = ['default', 'lato'] as const

export const AVATAR_SIZES = ['hide', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', 'max3xl'] as const
export const AVATAR_CORNERS = ['sm', 'md', 'lg', 'circle', 'none'] as const

export const CHAT_WIDTHS = ['full', 'narrow', 'xl', '2xl', '3xl', 'fill'] as const

export const UI_MODE = ['light', 'dark'] as const
export const UI_THEME = [
  'blue',
  'sky',
  'teal',
  'orange',
  'rose',
  'pink',
  'lime',
  'cyan',
  'fuchsia',
  'purple',
  'premium',
  'truegray',
  'coolgray',
  'bluegray',
] as const

export type ThemeColor = (typeof UI_THEME)[number]
export type ThemeBGColor = (typeof BG_THEME)[number]
export type ThemeMode = (typeof UI_MODE)[number]
export type AvatarSize = (typeof AVATAR_SIZES)[number]
export type AvatarCornerRadius = (typeof AVATAR_CORNERS)[number]
export type FontSetting = (typeof UI_FONT)[number]
export type ChatWidth = (typeof CHAT_WIDTHS)[number]

export type CustomUI = {
  bgCustom?: string
  msgBackground: string
  botBackground: string
  chatTextColor: string
  chatEmphasisColor: string
  chatQuoteColor: string
}

export type MessageOption = 'edit' | 'regen' | 'trash' | 'fork' | 'prompt' | 'schema-regen'

export type UISettings = {
  theme: string
  themeBg?: string

  mode: ThemeMode

  bgCustomGradient: string

  chatAvatarMode?: boolean
  avatarSize: AvatarSize
  avatarCorners: AvatarCornerRadius
  font: FontSetting
  imageWrap: boolean

  /** 0 -> 1. 0 = transparent. 1 = opaque */
  msgOpacity: number
  mobileSendOnEnter: boolean
  msgOptsInline: { [key in MessageOption]: { outer: boolean; pos: number } }

  viewMode?: 'split' | 'standard' | 'background' | 'background-contain' | 'background-cover'
  viewHeight?: number

  chatWidth?: ChatWidth
  chatAlternating?: number
  trimSentences?: boolean
  logPromptsToBrowserConsole: boolean
  contextWindowLine: boolean

  dark: CustomUI
  light: CustomUI
}

const customUiGuard = {
  msgBackground: 'string',
  botBackground: 'string',
  chatTextColor: 'string',
  chatEmphasisColor: 'string',
  chatQuoteColor: 'string',
} as const

export const uiGuard = {
  theme: 'string',
  themeBg: 'string?',
  mode: UI_MODE,

  bgCustomGradient: 'string',

  chatAvatarMode: 'boolean?',
  avatarSize: AVATAR_SIZES,
  avatarCorners: AVATAR_CORNERS,
  font: UI_FONT,
  imageWrap: 'boolean',
  msgOpacity: 'number',
  mobileSendOnEnter: 'boolean',

  chatWidth: CHAT_WIDTHS,
  logPromptsToBrowserConsole: 'boolean',

  light: customUiGuard,
  dark: customUiGuard,
} as const

export const defaultUIsettings: UISettings = {
  theme: 'sky',
  themeBg: 'truegray',

  bgCustomGradient: '',

  mode: 'dark',
  avatarSize: 'md',
  avatarCorners: 'circle',
  font: 'default',
  msgOpacity: 0.8,
  mobileSendOnEnter: false,

  chatWidth: 'full',
  chatAvatarMode: true,
  logPromptsToBrowserConsole: false,
  contextWindowLine: false,
  imageWrap: false,

  light: {
    msgBackground: '--bg-800',
    botBackground: '--bg-800',
    chatTextColor: '--text-800',
    chatEmphasisColor: '--text-600',
    chatQuoteColor: '--text-800',
  },

  dark: {
    msgBackground: '--bg-800',
    botBackground: '--bg-800',
    chatTextColor: '--text-800',
    chatEmphasisColor: '--text-600',
    chatQuoteColor: '--text-800',
  },

  msgOptsInline: {
    edit: { outer: true, pos: 0 },
    prompt: { outer: false, pos: 3 },
    fork: { outer: false, pos: 2 },
    regen: { outer: true, pos: 1 },
    trash: { outer: false, pos: 4 },
    'schema-regen': { outer: false, pos: 5 },
  },
}
