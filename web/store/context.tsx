import { JSX, createContext, createEffect, useContext } from 'solid-js'
import { createStore } from 'solid-js/store'
import { characterStore } from './character'
import { settingStore } from './settings'
import { chatStore } from './chat'
import { AppSchema } from '/common/types'
import { getSettingColor, userStore } from './user'
import { hexToRgb } from '../shared/util'
import { getActiveBots } from '../pages/Chat/util'

export type ContextState = {
  tooltip?: string | JSX.Element
  anonymize: boolean
  botMap: Record<string, AppSchema.Character>
  chatBots: AppSchema.Character[]
  activeBots: AppSchema.Character[]
  handle: string
  impersonate?: AppSchema.Character
  profile?: AppSchema.Profile
  char?: AppSchema.Character
  chat?: AppSchema.Chat
  trimSentences: boolean
  bg: {
    bot: JSX.CSSProperties
    user: JSX.CSSProperties
    ooc: JSX.CSSProperties
  }
}

const initial: ContextState = {
  anonymize: false,
  botMap: {},
  handle: 'You',
  chatBots: [],
  trimSentences: false,
  bg: {
    user: {},
    bot: {},
    ooc: {},
  },
  activeBots: [],
}

const AppContext = createContext([initial, (next: Partial<ContextState>) => {}] as const)

export function ContextProvider(props: { children: any }) {
  const [state, setState] = createStore(initial)

  const chars = characterStore()
  const chats = chatStore()
  const users = userStore()
  const cfg = settingStore()

  createEffect(() => {
    const botBackground = getRgbaFromVar(
      users.current.botBackground || 'bg-800',
      users.ui.msgOpacity
    )
    const userBackground = getRgbaFromVar(
      users.current.msgBackground || 'bg-800',
      users.ui.msgOpacity
    )
    const oocBackground = getRgbaFromVar('bg-1000', users.ui.msgOpacity)

    const next: Partial<ContextState> = {
      bg: {
        bot: botBackground,
        user: userBackground,
        ooc: oocBackground,
      },

      anonymize: cfg.anonymize,
      botMap: chars.characters.map,
      chatBots: chars.characters.list,
      impersonate: chars.impersonating,
      char: chats.active?.char,
      chat: chats.active?.chat,
      profile: users.profile,
      handle: chars.impersonating?.name || users.profile?.handle || 'You',
      trimSentences: users.ui.trimSentences ?? false,
      activeBots: chats.active?.chat ? getActiveBots(chats.active.chat, chars.characters.map) : [],
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
