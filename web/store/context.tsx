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

export type ContextState = {
  tooltip?: string | JSX.Element
  anonymize: boolean

  /** Current chat temporary bots */
  tempMap: Record<string, AppSchema.Character>
  /** Current chat temporary bots */
  tempBots: AppSchema.Character[]

  /** Current chat bots */
  activeMap: Record<string, AppSchema.Character>
  /** Current chat bots */
  activeBots: AppSchema.Character[]

  /** All user-owned bots */
  botMap: Record<string, AppSchema.Character>
  /** All user-owned bots */
  chatBots: AppSchema.Character[]

  handle: string
  impersonate?: AppSchema.Character
  profile?: AppSchema.Profile
  flags: FeatureFlags
  char?: AppSchema.Character
  chat?: AppSchema.Chat
  trimSentences: boolean
  bg: {
    bot: JSX.CSSProperties
    user: JSX.CSSProperties
    ooc: JSX.CSSProperties
  }
  promptHistory: any
}

const initial: ContextState = {
  anonymize: false,
  tempMap: {},
  botMap: {},
  activeMap: {},

  chatBots: [],
  tempBots: [],
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

  const activeBots = createMemo(() => {
    const list = chats.active?.chat ? getActiveBots(chats.active.chat, chars.characters.map) : []
    return list
  })

  createEffect(() => {
    const next: Partial<ContextState> = {
      bg: visuals(),
      flags: cfg.flags,
      anonymize: cfg.anonymize,
      tempMap: chats.active?.chat.tempCharacters || {},
      tempBots: Object.values(chats.active?.chat.tempCharacters || {}),

      botMap: chars.characters.map,
      chatBots: chars.characters.list,

      activeMap: toMap(activeBots()),
      activeBots: activeBots(),

      impersonate: chars.impersonating,
      char: chats.active?.char,
      chat: chats.active?.chat,
      profile: users.profile,
      handle: chars.impersonating?.name || users.profile?.handle || 'You',
      trimSentences: users.ui.trimSentences ?? false,
      promptHistory: chats.promptHistory,
    }

    setState(next)
  })

  return <AppContext.Provider value={[state, setState]}>{props.children}</AppContext.Provider>
}

export function useAppContext() {
  return useContext(AppContext)
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
