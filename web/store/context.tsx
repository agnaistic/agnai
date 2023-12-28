import { JSX, createContext, createEffect, createMemo, useContext } from 'solid-js'
import { createStore } from 'solid-js/store'
import { characterStore } from './character'
import { settingStore } from './settings'
import { chatStore } from './chat'
import { AppSchema } from '/common/types'
import { getSettingColor, userStore } from './user'
import { hexToRgb, toMap } from '../shared/util'
import { getActiveBots } from '../pages/Chat/util'
import { FeatureFlags } from './flags'
import { distinct } from '/common/util'
import { PresetInfo, getClientPreset } from '../shared/adapter'

export type ContextState = {
  tooltip?: string | JSX.Element
  anonymize: boolean

  /** Current chat temporary bots */
  tempMap: Record<string, AppSchema.Character>

  /** Current chat bots */
  activeMap: Record<string, AppSchema.Character>
  /** Current chat bots */
  activeBots: AppSchema.Character[]

  /** All bots from user, chats, current chat */
  allBots: Record<string, AppSchema.Character>

  /** All user-owned bots */
  // botMap: Record<string, AppSchema.Character>
  /** All user-owned bots */
  // chatBots: AppSchema.Character[]

  handle: string
  impersonate?: AppSchema.Character
  profile?: AppSchema.Profile
  flags: FeatureFlags
  char?: AppSchema.Character
  chat?: AppSchema.Chat
  replyAs?: string
  trimSentences: boolean
  bg: {
    bot: JSX.CSSProperties
    user: JSX.CSSProperties
    ooc: JSX.CSSProperties
  }
  promptHistory: any
  info?: PresetInfo
}

const initial: ContextState = {
  anonymize: false,
  tempMap: {},
  allBots: {},

  activeMap: {},
  activeBots: [],

  handle: 'You',
  trimSentences: false,
  flags: {} as any,
  bg: {
    user: {},
    bot: {},
    ooc: {},
  },
  promptHistory: {},
}

const AppContext = createContext([initial, (next: Partial<ContextState>) => {}] as const)

export function ContextProvider(props: { children: any }) {
  const [state, setState] = createStore(initial)

  const chars = characterStore()
  const chats = chatStore()
  const users = userStore()
  const cfg = settingStore()

  const visuals = createMemo(() => {
    const botBackground = getRgbaFromVar(
      users.current.botBackground || 'bg-800',
      users.ui.msgOpacity
    )
    const userBackground = getRgbaFromVar(
      users.current.msgBackground || 'bg-800',
      users.ui.msgOpacity
    )
    const oocBackground = getRgbaFromVar('bg-1000', users.ui.msgOpacity)

    return {
      bot: botBackground,
      user: userBackground,
      ooc: oocBackground,
    }
  })

  const allBots = createMemo(() => {
    const curr = chars.chatChars.list
    const temps = Object.values(chats.active?.chat.tempCharacters || {})

    const all = chars.characters.list.concat(curr).concat(temps)
    return toMap(all)
  })

  const activeBots = createMemo<AppSchema.Character[]>(() => {
    if (!chats.active?.chat) return []

    const curr = chars.chatChars.map
    const temps = chats.active?.chat.tempCharacters || {}

    const active = getActiveBots(chats.active.chat, { ...curr, ...temps, ...chars.characters.map })
    return distinct(active)
  })

  const handle = createMemo(() => {
    const impersonate = chars.impersonating?.name
    const handle = users.profile?.handle
    return impersonate || handle || 'You'
  })

  createEffect(() => {
    const info = getClientPreset(chats.active?.chat)
    const next: Partial<ContextState> = {
      bg: visuals(),
      flags: cfg.flags,
      anonymize: cfg.anonymize,
      tempMap: chats.active?.chat.tempCharacters || {},

      allBots: allBots(),

      activeMap: toMap(activeBots()),
      activeBots: activeBots(),

      impersonate: chars.impersonating,
      char: chats.active?.char,
      chat: chats.active?.chat,
      replyAs: chats.active?.replyAs,
      profile: users.profile,
      handle: handle(),
      trimSentences: users.ui.trimSentences ?? false,
      promptHistory: chats.promptHistory,
      info,
    }

    setState(next)
  })

  return <AppContext.Provider value={[state, setState]}>{props.children}</AppContext.Provider>
}

export function useAppContext() {
  const [state, setState] = useContext(AppContext)

  return [state, { setState }] as const
}

function getRgbaFromVar(cssVar: string, opacity: number): JSX.CSSProperties {
  const hex = getSettingColor(cssVar)
  const rgb = hexToRgb(hex)
  if (!rgb) return {}

  return {
    background: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`,
    'backdrop-filter': 'blur(5px)',
  }
}
