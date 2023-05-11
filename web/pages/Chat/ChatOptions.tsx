import { Book, Download, Palette, Settings, Sliders, Trash, Users, Camera } from 'lucide-solid'
import { Component, Show, createMemo } from 'solid-js'
import Button from '../../shared/Button'
import { Toggle } from '../../shared/Toggle'
import { chatStore, settingStore, toastStore, userStore } from '../../store'
import { domToPng } from 'modern-screenshot'
import { getRootRgb } from '../../shared/util'

export type ChatModal =
  | 'export'
  | 'settings'
  | 'invite'
  | 'memory'
  | 'gen'
  | 'ui'
  | 'members'
  | 'delete'
  | 'none'

const ChatOptions: Component<{ setModal: (modal: ChatModal) => void }> = (props) => {
  const chats = chatStore((s) => ({
    ...s.active,
    lastId: s.lastChatId,
    opts: s.opts,
    members: s.chatProfiles,
  }))
  const user = userStore()
  const cfg = settingStore()

  const toggleOocMessages = () => {
    chatStore.option('hideOoc', !chats.opts.hideOoc)
  }

  const toggleEditing = () => {
    chatStore.option('editing', !chats.opts.editing)
  }

  const toggleScreenshot = (value: boolean) => {
    chatStore.option('screenshot', value)
  }

  const isOwner = createMemo(() => chats.chat?.userId === user.user?._id)

  const screenshotChat = async () => {
    if (chats.opts.screenshot) return
    const ele = document.getElementById('chat-messages')
    if (!ele) {
      toastStore.error(`Screenshot failed: Couldn't find messages element`)
      return
    }
    toggleScreenshot(true)
    const bgRgb = getRootRgb('bg-900')
    domToPng(ele, {
      backgroundColor: `rgb(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b})`,
    })
      .then((dataUrl) => {
        const link = document.createElement('a')
        link.download = 'agnai_chat_screenshot.png'
        link.href = dataUrl
        link.click()
        toggleScreenshot(false)
      })
      .catch((err) => {
        console.error(err)
        toastStore.error(`Screenshot failed: error logged in console`)
        toggleScreenshot(false)
      })
  }

  return (
    <div class="flex w-60 flex-col gap-2 p-2">
      <Show when={chats.members.length > 1}>
        <Option onClick={toggleOocMessages}>
          <div class="flex w-full items-center justify-between">
            <div>Hide OOC messages</div>
            <Toggle
              class="flex items-center"
              fieldName="editChat"
              value={chats.opts.hideOoc}
              onChange={toggleOocMessages}
            />
          </div>
        </Option>
      </Show>
      <Show when={isOwner()}>
        <Option onClick={toggleEditing}>
          <div class="flex w-full items-center justify-between">
            <div>Enable Chat Editing</div>
            <Toggle
              class="flex items-center"
              fieldName="editChat"
              value={chats.opts.editing}
              onChange={toggleEditing}
            />
          </div>
        </Option>

        <Option onClick={settingStore.toggleAnonymize}>
          <div class="flex w-full items-center justify-between">
            <div>Anonymize Chat</div>
            <Toggle
              class="flex items-center"
              fieldName="anonymizeChat"
              value={cfg.anonymize}
              onChange={settingStore.toggleAnonymize}
            />
          </div>
        </Option>

        <Option onClick={screenshotChat}>
          {/* Unfortunately msgs has to be abbreviated to fit on one line */}
          <Camera />
          <Show when={!chats.opts.screenshot}>Take Screenshot</Show>
          <Show when={chats.opts.screenshot}>
            <em>Loading, please wait...</em>
          </Show>
        </Option>

        <Option
          onClick={() => props.setModal('memory')}
          class="flex justify-start gap-2 hover:bg-[var(--bg-700)]"
        >
          <Book />
          Edit Chat Memory
        </Option>

        <Option
          onClick={() => props.setModal('members')}
          class="flex justify-start gap-2 hover:bg-[var(--bg-700)]"
        >
          <Users /> Participants
        </Option>

        <Option
          onClick={() => props.setModal('gen')}
          class="flex justify-start gap-2 hover:bg-[var(--bg-700)]"
        >
          <Sliders /> Generation Settings
        </Option>

        <Option
          onClick={() => props.setModal('settings')}
          class="flex justify-start gap-2 hover:bg-[var(--bg-700)]"
        >
          <Settings /> Chat Settings
        </Option>
      </Show>

      <Option
        onClick={() => props.setModal('ui')}
        class="flex justify-start gap-2 hover:bg-[var(--bg-700)]"
      >
        <Palette /> UI Settings
      </Option>

      <Option
        onClick={() => props.setModal('export')}
        class="flex justify-start gap-2 hover:bg-[var(--bg-700)]"
      >
        <Download /> Export Chat
      </Option>

      <Show when={isOwner()}>
        <Option
          onClick={() => props.setModal('delete')}
          class="flex justify-start gap-2 hover:bg-[var(--bg-700)]"
        >
          <Trash /> Delete Chat
        </Option>
      </Show>
    </div>
  )
}

const Option: Component<{
  children: any
  class?: string
  onClick: () => void
  close?: () => void
}> = (props) => {
  const onClick = () => {
    props.onClick()
    props.close?.()
  }
  return (
    <Button schema="secondary" size="sm" onClick={onClick} alignLeft>
      {props.children}
    </Button>
  )
}

export default ChatOptions
