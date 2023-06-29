import { JSX, createContext, createEffect, useContext } from 'solid-js'
import { createStore } from 'solid-js/store'
import { characterStore } from './character'
import { settingStore } from './settings'
import { chatStore } from './chat'
import { AppSchema } from '/common/types'
import { userStore } from './user'

export type ContextState = {
  tooltip?: string | JSX.Element
  anonymize: boolean
  botMap: Record<string, AppSchema.Character>
  chatBots: AppSchema.Character[]
  handle: string
  impersonate?: AppSchema.Character
  profile?: AppSchema.Profile
  char?: AppSchema.Character
  chat?: AppSchema.Chat
  trimSentences: boolean
}

const initial: ContextState = {
  anonymize: false,
  botMap: {},
  handle: 'You',
  chatBots: [],
  trimSentences: false,
}

const AppContext = createContext([initial, (next: Partial<ContextState>) => {}] as const)

export function ContextProvider(props: { children: any }) {
  const [state, setState] = createStore(initial)

  const chars = characterStore()
  const chats = chatStore()
  const users = userStore()
  const cfg = settingStore()

  createEffect(() => {
    const next: Partial<ContextState> = {
      anonymize: cfg.anonymize,
      botMap: chars.characters.map,
      chatBots: chars.characters.list,
      impersonate: chars.impersonating,
      char: chats.active?.char,
      chat: chats.active?.chat,
      profile: users.profile,
      handle: chars.impersonating?.name || users.profile?.handle || 'You',
      trimSentences: users.ui.trimSentences ?? false,
    }

    setState(next)
  })

  return <AppContext.Provider value={[state, setState]}>{props.children}</AppContext.Provider>
}

export function useAppContext() {
  return useContext(AppContext)
}
