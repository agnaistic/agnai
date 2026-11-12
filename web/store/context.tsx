import { JSX, createContext, createEffect, createMemo, useContext } from 'solid-js'
import { createStore } from 'solid-js/store'
import { characterStore } from './character'
import { settingStore } from './settings'
import { ChatDetail, chatStore } from './chat'
import { AppSchema, UI } from '/common/types'
import { userStore } from './user'
import { toMap } from '../shared/util'
import { getActiveBots } from '../pages/Chat/util'
import { FeatureFlags } from './flags'
import { combine, distinct } from '/common/util'
import { getRgbaFromVar } from '../shared/colors'
import { ChatMessageExt, MsgState, msgStore } from './message'
import { ChatTree, resolveChatPath } from '/common/chat'
import { PresetStateProvider } from './preset-context'
import { pageStore } from './page'
import { ResponseState, responseStore } from './response'
import { imageStore } from './images'
import { getStoppingStrings } from '/common/requests/payloads'

export type ChatContext = {
  appReady: boolean
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

  profileMap: Record<string, AppSchema.Profile>

  messages: {
    path: ChatMessageExt[]
    viewing: ChatMessageExt[]
  }

  nameStops: string[]

  /** All user-owned bots */
  // botMap: Record<string, AppSchema.Character>
  /** All user-owned bots */
  // chatBots: AppSchema.Character[]

  handle: string
  impersonate?: AppSchema.Character
  user?: AppSchema.User
  profile?: AppSchema.Profile
  active?: ChatDetail
  chatProfiles?: AppSchema.Profile[]
  flags: FeatureFlags
  char?: AppSchema.Character
  chat?: AppSchema.Chat
  showMessageCount: number
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
  msgDeleting?: boolean
  waiting?: ResponseState['waiting']
  imgPrompt?: ResponseState['imgWaiting']
  imgWaiting?: MsgState['imgWaiting']
  imgPreview?: string
  status?: MsgState['hordeStatus']
  attachments: MsgState['attachments']
  ui: UI.UISettings
  providers?: AppSchema.Provider[]
}

const initial: ChatContext = {
  appReady: false,
  anonymize: false,
  tempMap: {},
  allBots: {},

  attachments: {},

  activeMap: {},
  activeBots: [],
  profileMap: {},

  messages: {
    path: [],
    viewing: [],
  },

  nameStops: [],

  showMessageCount: 0,
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

const Context = createContext([initial, (next: Partial<ChatContext>) => {}] as const)

export function ContextProvider(props: { children: any }) {
  const [state, setState] = createStore(initial)

  const image = imageStore((s) => ({ preview: s.preview, signal: s.signal }))
  const chars = characterStore((s) => ({
    chatChars: s.chatChars,
    characters: s.characters,
    impersonating: s.impersonating,
  }))
  const chats = chatStore((s) => ({
    active: s.details[s.lastChatId || ''],
    allChats: s.allChats,
    lastChatId: s.lastChatId,
    chatProfiles: s.chatProfiles,
    promptHistory: s.promptHistory,
    opts: s.opts,
  }))
  const users = userStore((s) => ({
    current: s.current,
    ui: s.ui,
    profile: s.profile,
    user: s.user,
  }))
  const cfg = settingStore((s) => ({ anonymize: s.anonymize, config: s.config, inited: !!s.init }))
  const msgs = msgStore((s) => ({
    graph: s.graph,
    imgWaiting: s.imgWaiting,
    hordeStatus: s.hordeStatus,
    attachments: s.attachments,
    deleting: s.deleting,
    showMessageCount: s.showMessageCount,
    msgs: s.msgs,
  }))

  const response = responseStore((s) => ({
    waiting: s.waiting,
    imgWaiting: s.imgWaiting,
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

  const pathMessages = createMemo(() => {
    const chat =
      chats.active?.chat ||
      chats.allChats.find((c) => (chats.lastChatId ? c._id === chats.lastChatId : undefined))

    if (!chat) return []

    const leafId = chat?.treeLeafId || msgs.msgs.slice(-1)[0]?._id || ''
    const path = resolveChatPath(msgs.graph.tree, leafId)
    return path
  })

  const chatMsgs = createMemo(() => {
    const path = pathMessages()

    const filtered = path.filter((msg) => {
      if (chats.opts.hideOoc && msg.ooc) return false
      return true
    })

    return filtered.slice(-msgs.showMessageCount)
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

  const nameStops = createMemo(() => {
    const stops = getStoppingStrings(
      {
        user: users.user!,
        char: chats.active?.char,
        characters: chars.chatChars.map,
        members: chats.chatProfiles.concat(users.profile!).filter((profile) => !!profile),
      },
      undefined
    )
    return stops
  })

  createEffect(() => {
    // We will try to use our cache if it's available to speed some things up
    const chat =
      chats.active?.chat ||
      chats.allChats.find((c) => (chats.lastChatId ? c._id === chats.lastChatId : undefined))

    const char = chats.active?.char
      ? chats.active.char
      : chat?.characterId
      ? chars.chatChars.map[chat.characterId] || chars.characters.map[chat.characterId]
      : undefined

    const next: Partial<ChatContext> = {
      bg: visuals(),
      appReady: cfg.inited,
      flags: page.flags,
      anonymize: cfg.anonymize,
      config: cfg.config,
      tempMap: chats.active?.chat.tempCharacters || {},

      allBots: allBots(),

      activeMap: toMap(activeBots()),
      activeBots: activeBots(),
      active: chats.active,
      profileMap: toMap(chats.chatProfiles),

      messages: {
        path: pathMessages(),
        viewing: chatMsgs(),
      },

      nameStops: nameStops(),

      msgDeleting: msgs.deleting,
      impersonate: chars.impersonating,
      char: char,
      chat: chat,
      showMessageCount: msgs.showMessageCount,
      replyAs: chats.active?.replyAs,
      user: users.user,
      profile: users.profile,
      chatProfiles: chats.chatProfiles,
      handle: handle(),
      trimSentences: users.ui.trimSentences ?? false,
      promptHistory: chats.promptHistory,
      chatTree: msgs.graph.tree,
      waiting: response.waiting,
      imgPrompt: response.imgWaiting,
      imgWaiting: msgs.imgWaiting,
      imgPreview: msgs.imgWaiting ? image.preview?.base64 : undefined,
      status: msgs.hordeStatus,
      attachments: msgs.attachments,
      // canUseAttachments: canAttachImage(detail?.conn, subModel()),
      ui: users.ui,
      providers: users.user?.providers,
    }

    setState(next)
  })

  return (
    <Context.Provider value={[state, setState]}>
      <PresetStateProvider>{props.children}</PresetStateProvider>
    </Context.Provider>
  )
}

export function useAppContext() {
  const [state, setState] = useContext(Context)

  return [state, { setState }] as const
}

export function getAppContext() {
  const chars = characterStore.mapState((s) => ({
    chatChars: s.chatChars,
    characters: s.characters,
    impersonating: s.impersonating,
  }))
  const chats = chatStore.mapState((s) => ({
    active: s.details[s.lastChatId || ''],
    allChats: s.allChats,
    lastChatId: s.lastChatId,
    chatProfiles: s.chatProfiles,
    promptHistory: s.promptHistory,
  }))
  const users = userStore.mapState((s) => ({
    current: s.current,
    ui: s.ui,
    profile: s.profile,
    user: s.user,
  }))
  const cfg = settingStore.mapState((s) => ({
    anonymize: s.anonymize,
    config: s.config,
    inited: !!s.init,
  }))
  const msgs = msgStore.mapState((s) => ({
    graph: s.graph,
    imgWaiting: s.imgWaiting,
    hordeStatus: s.hordeStatus,
    attachments: s.attachments,
    deleting: s.deleting,
  }))

  const chat =
    chats.active?.chat ||
    chats.allChats.find((c) => (chats.lastChatId ? c._id === chats.lastChatId : undefined))

  const char = chats.active?.char
    ? chats.active.char
    : chat?.characterId
    ? chars.chatChars.map[chat.characterId] || chars.characters.map[chat.characterId]
    : undefined

  const next = {
    appReady: cfg.inited,
    anonymize: cfg.anonymize,
    config: cfg.config,
    tempMap: chats.active?.chat.tempCharacters || {},

    allBots: toAllBots(
      chars.chatChars.list,
      chars.characters.list,
      chats.active.chat.tempCharacters
    ),

    // activeMap: toMap(activeBots()),
    // activeBots: activeBots(),

    active: chats.active,

    msgDeleting: msgs.deleting,
    impersonate: chars.impersonating,
    char: char,
    chat: chat,
    replyAs: chats.active?.replyAs,
    user: users.user,
    profile: users.profile,
    chatProfiles: chats.chatProfiles,
    handle: chars.impersonating?.name || users.profile?.handle || 'You',
    chatTree: msgs.graph.tree,
    // attachments: msgs.attachments,
    // canUseAttachments: canAttachImage(detail?.conn, subModel()),
  }

  return next
}

function toAllBots(
  chatChars: AppSchema.Character[],
  allChars: AppSchema.Character[],
  tempChars: Record<string, AppSchema.Character> | undefined
) {
  const temps = Object.values(tempChars || {})

  const all = combine(allChars, chatChars.concat(temps))
  const map = toMap(all)

  return map
}
