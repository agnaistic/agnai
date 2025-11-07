import { Component, Show, onCleanup } from 'solid-js'
import { createDebounce } from '../../shared/util'
import { userStore } from '../../store'
import { UI } from '/common/types'
import Tabs, { useTabs } from '/web/shared/Tabs'
import { MessageUISettings } from './ui/MessageUISettings'
import { ChatUISettings } from './ui/ChatUISettings'
import { ThemeUISettings } from './ui/ThemeUISettings'

const TABS = {
  Theme: 'Theme',
  Chat: 'Chat',
  Messages: 'Messages',
}

const UISettings: Component<{}> = () => {
  const [tryCustomUI, unsubCustomUi] = createDebounce((update: Partial<UI.CustomUI>) => {
    userStore.tryCustomUI(update)
  }, 50)

  onCleanup(() => unsubCustomUi())

  const tabs = useTabs([TABS.Theme, TABS.Chat, TABS.Messages])

  return (
    <>
      <Tabs display="tabs" tabs={tabs.tabs()} select={tabs.select} selected={tabs.selected} />

      <Show when={tabs.current() === TABS.Theme}>
        <ThemeUISettings tryCustom={tryCustomUI} />
      </Show>

      <Show when={tabs.current() === TABS.Chat}>
        <ChatUISettings />
      </Show>

      <Show when={tabs.current() === TABS.Messages}>
        <MessageUISettings tryUpdate={tryCustomUI} />
      </Show>
    </>
  )
}

export default UISettings
