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
import { PresetStateProvider } from './preset-context'
import { pageStore } from './page'

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
  chatProfiles?: AppSchema.Profile[]
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
  imgWaiting?: MsgState['imgWaiting']
  status?: MsgState['hordeStatus']
  attachments: MsgState['attachments']
  ui: UI.UISettings
  providers?: AppSchema.Provider[]
}

const initial: ContextState = {
  anonymize: false,
  tempMap: {},
  allBots: {},

  attachments: {},

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
  // service: undefined,
  // format: undefined,
}

const AppContext = createContext([initial, (next: Partial<ContextState>) => {}] as const)

export function ContextProvider(props: { children: any }) {
  const [state, setState] = createStore(initial)

  const chars = characterStore((s) => ({
    chatChars: s.chatChars,
    characters: s.characters,
    impersonating: s.impersonating,
  }))
  const chats = chatStore((s) => ({
    active: s.active,
    allChats: s.allChats,
    lastChatId: s.lastChatId,
    allChars: s.allChars,
    chatProfiles: s.chatProfiles,
    promptHistory: s.promptHistory,
  }))
  const users = userStore((s) => ({
    current: s.current,
    ui: s.ui,
    profile: s.profile,
    user: s.user,
  }))
  const cfg = settingStore((s) => ({ anonymize: s.anonymize, config: s.config }))
  const msgs = msgStore((s) => ({
    graph: s.graph,
    waiting: s.waiting,
    imgWaiting: s.imgWaiting,
    hordeStatus: s.hordeStatus,
    attachments: s.attachments,
  }))
  const page = pageStore((s) => ({ flags: s.flags }))

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
    const map = toMap(all)

    return map
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

  createEffect(() => {
    // We will try to use our cache if it's available to speed some things up
    const chat =
      chats.active?.chat ||
      chats.allChats.find((c) => (chats.lastChatId ? c._id === chats.lastChatId : undefined))
    const char = chats.active?.char
      ? chats.active.char
      : chat?.characterId
      ? chats.allChars.map[chat.characterId]
      : undefined

    const next: Partial<ContextState> = {
      bg: visuals(),
      flags: page.flags,
      anonymize: cfg.anonymize,
      config: cfg.config,
      tempMap: chats.active?.chat.tempCharacters || {},

      allBots: allBots(),

      activeMap: toMap(activeBots()),
      activeBots: activeBots(),

      impersonate: chars.impersonating,
      char: char,
      chat: chat,
      replyAs: chats.active?.replyAs,
      user: users.user,
      profile: users.profile,
      chatProfiles: chats.chatProfiles,
      handle: handle(),
      trimSentences: users.ui.trimSentences ?? false,
      promptHistory: chats.promptHistory,
      chatTree: msgs.graph.tree,
      waiting: msgs.waiting,
      imgWaiting: msgs.imgWaiting,
      status: msgs.hordeStatus,
      attachments: msgs.attachments,
      // canUseAttachments: canAttachImage(detail?.conn, subModel()),
      ui: users.ui,
      providers: users.user?.providers,
    }

    setState(next)
  })

  return (
    <AppContext.Provider value={[state, setState]}>
      <PresetStateProvider>{props.children}</PresetStateProvider>
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const [state, setState] = useContext(AppContext)

  return [state, { setState }] as const
}
