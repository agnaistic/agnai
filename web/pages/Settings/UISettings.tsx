import { Component } from 'solid-js'
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
  const tabs = useTabs([TABS.Theme, TABS.Chat, TABS.Messages])

  return (
    <>
      <Tabs tabs={tabs.tabs()} select={tabs.select} selected={tabs.selected} />

      <div classList={{ hidden: tabs.current() !== TABS.Theme }}>
        <ThemeUISettings />
      </div>

      <div classList={{ hidden: tabs.current() !== TABS.Chat }}>
        <ChatUISettings />
      </div>

      <div classList={{ hidden: tabs.current() !== TABS.Messages }}>
        <MessageUISettings />
      </div>
    </>
  )
}

export default UISettings
