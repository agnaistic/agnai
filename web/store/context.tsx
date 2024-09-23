import { JSX, createContext, createEffect, createMemo, useContext } from 'solid-js'
import { createStore } from 'solid-js/store'
import { characterStore } from './character'
import { settingStore } from './settings'
import { chatStore } from './chat'
import { AppSchema, UI } from '/common/types'
import { userStore } from './user'
import { toMap } from '../shared/util'
import { getActiveBots } from '../pages/Chat/util'
import { FeatureFlags } from './flags'
import { distinct } from '/common/util'
import { getRgbaFromVar } from '../shared/colors'
import { MsgState, msgStore } from './message'
import { ChatTree } from '/common/chat'
import { presetStore } from './presets'
import { getChatPreset } from '/common/prompt'

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
  user?: AppSchema.User
  profile?: AppSchema.Profile
  flags: FeatureFlags
  char?: AppSchema.Character
  chat?: AppSchema.Chat
  replyAs?: string
  trimSentences: boolean
  config: AppSchema.AppConfig
  bg: {
    bot: JSX.CSSProperties
    user: JSX.CSSProperties
    ooc: JSX.CSSProperties
  }
  promptHistory: any
  chatTree: ChatTree
  waiting?: MsgState['waiting']
  status?: MsgState['hordeStatus']
  preset?: AppSchema.UserGenPreset
  ui: UI.UISettings
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
  chatTree: {},
  ui: {} as any,
  config: {} as any,
}

const AppContext = createContext([initial, (next: Partial<ContextState>) => {}] as const)

export function ContextProvider(props: { children: any }) {
  const [state, setState] = createStore(initial)

  const chars = characterStore()
  const chats = chatStore()
  const users = userStore()
  const cfg = settingStore()
  const msgs = msgStore()
  const presets = presetStore()

  const visuals = createMemo(() => {
    const botBackground = getRgbaFromVar(
      users.current.botBackground || 'bg-800',
      users.ui.msgOpacity,
      'chat-bot'
    )
    const userBackground = getRgbaFromVar(
      users.current.msgBackground || 'bg-800',
      users.ui.msgOpacity,
      'chat-user'
    )

    const oocBackground = getRgbaFromVar('bg-1000', users.ui.msgOpacity, 'chat-ooc')

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

    const active = getActiveBots(chats.active.chat, { ...temps, ...chars.characters.map, ...curr })
    return distinct(active)
  })

  const handle = createMemo(() => {
    const impersonate = chars.impersonating?.name
    const handle = users.profile?.handle
    return impersonate || handle || 'You'
  })

  const preset = createMemo(() => {
    if (!chats.active?.chat || !users.user) return
    const match = getChatPreset(
      chats.active.chat,
      users.user,
      presets.presets
    ) as AppSchema.UserGenPreset
    return match
  })

  createEffect(() => {
    const next: Partial<ContextState> = {
      bg: visuals(),
      flags: cfg.flags,
      anonymize: cfg.anonymize,
      config: cfg.config,
      tempMap: chats.active?.chat.tempCharacters || {},

      allBots: allBots(),

      activeMap: toMap(activeBots()),
      activeBots: activeBots(),

      impersonate: chars.impersonating,
      char: chats.active?.char,
      chat: chats.active?.chat,
      replyAs: chats.active?.replyAs,
      user: users.user,
      profile: users.profile,
      handle: handle(),
      trimSentences: users.ui.trimSentences ?? false,
      promptHistory: chats.promptHistory,
      chatTree: msgs.graph.tree,
      waiting: msgs.waiting,
      status: msgs.hordeStatus,
      preset: preset(),
      ui: users.ui,
    }

    setState(next)
  })

  return <AppContext.Provider value={[state, setState]}>{props.children}</AppContext.Provider>
}

export function useAppContext() {
  const [state, setState] = useContext(AppContext)

  return [state, { setState }] as const
}
