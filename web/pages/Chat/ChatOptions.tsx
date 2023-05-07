import { Book, Download, MailPlus, Palette, Settings, Sliders, Users, Camera } from 'lucide-solid'
import { Component, Show, createMemo } from 'solid-js'
import Button from '../../shared/Button'
import { Toggle } from '../../shared/Toggle'
import { chatStore, settingStore, toastStore, userStore } from '../../store'
import { domToPng } from 'modern-screenshot'
import { getRootRgb, getRootVariable } from '../../shared/util'

export type ChatModal = 'export' | 'settings' | 'invite' | 'memory' | 'gen' | 'ui' | 'members'

const ChatOptions: Component<{
  show: (modal: ChatModal) => void
  editing: boolean
  toggleEditing: () => void
  screenshotInProgress: boolean
  setScreenshotInProgress: (inProgress: boolean) => void
  hideOocMessages: boolean
  toggleOocMessages?: () => void
}> = (props) => {
  const chats = chatStore((s) => ({ ...s.active, lastId: s.lastChatId }))
  const user = userStore()
  const cfg = settingStore()

  const isOwner = createMemo(() => chats.chat?.userId === user.user?._id)

  const screenshotChat = async () => {
    if (props.screenshotInProgress) return
    const ele = document.getElementById('chat-messages')
    if (!ele) {
      toastStore.error(`Screenshot failed: Couldn't find messages element`)
      return
    }
    props.setScreenshotInProgress(true)
    const bgRgb = getRootRgb('bg-900')
    domToPng(ele, {
      backgroundColor: `rgb(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b})`,
    })
      .then((dataUrl) => {
        const link = document.createElement('a')
        link.download = 'agnai_chat_screenshot.png'
        link.href = dataUrl
        link.click()
        props.setScreenshotInProgress(false)
      })
      .catch((err) => {
        console.error(err)
        toastStore.error(`Screenshot failed: error logged in console`)
        props.setScreenshotInProgress(false)
      })
  }

  return (
    <div class="flex w-60 flex-col gap-2 p-2">
      <Show when={props.toggleOocMessages}>
        <Option onClick={props.toggleOocMessages!}>
          <div class="flex w-full items-center justify-between">
            <div>Hide OOC messages</div>
            <Toggle
              class="flex items-center"
              fieldName="editChat"
              value={props.hideOocMessages}
              onChange={props.toggleOocMessages!}
            />
          </div>
        </Option>
      </Show>
      <Show when={isOwner()}>
        <Option onClick={props.toggleEditing}>
          <div class="flex w-full items-center justify-between">
            <div>Enable Chat Editing</div>
            <Toggle
              class="flex items-center"
              fieldName="editChat"
              value={props.editing}
              onChange={props.toggleEditing}
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
          <Show when={!props.screenshotInProgress}>Take Screenshot</Show>
          <Show when={props.screenshotInProgress}>
            <em>Loading, please wait...</em>
          </Show>
        </Option>

        <Option
          onClick={() => props.show('memory')}
          class="flex justify-start gap-2 hover:bg-[var(--bg-700)]"
        >
          <Book />
          Edit Chat Memory
        </Option>

        <Option
          onClick={() => props.show('members')}
          class="flex justify-start gap-2 hover:bg-[var(--bg-700)]"
        >
          <Users /> Participants
        </Option>

        <Option
          onClick={() => props.show('gen')}
          class="flex justify-start gap-2 hover:bg-[var(--bg-700)]"
        >
          <Sliders /> Generation Settings
        </Option>

        <Option
          onClick={() => props.show('settings')}
          class="flex justify-start gap-2 hover:bg-[var(--bg-700)]"
        >
          <Settings /> Chat Settings
        </Option>
      </Show>

      <Option
        onClick={() => props.show('ui')}
        class="flex justify-start gap-2 hover:bg-[var(--bg-700)]"
      >
        <Palette /> UI Settings
      </Option>

      <Option
        onClick={() => props.show('export')}
        class="flex justify-start gap-2 hover:bg-[var(--bg-700)]"
      >
        <Download /> Export Chat
      </Option>
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
