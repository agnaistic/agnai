import {
  Book,
  Download,
  Palette,
  Settings,
  User,
  Sliders,
  Trash,
  Users,
  Camera,
} from 'lucide-solid'
import { Component, Show, createMemo, JSX } from 'solid-js'
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

const ChatOptions: Component<{
  setModal: (modal: ChatModal) => void
  toggleCharEditor: () => void
}> = (props) => {
  const chats = chatStore((s) => ({
    ...s.active,
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
    domToPng(ele, { backgroundColor: `rgb(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b})` })
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
              class="h-50 flex items-center"
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
            <div>Anonymize</div>
            <Toggle
              class="flex items-center"
              fieldName="anonymizeChat"
              value={cfg.anonymize}
              onChange={settingStore.toggleAnonymize}
            />
          </div>
        </Option>

        <Option onClick={screenshotChat}>
          <Camera />
          <div class="ml-1">
            <Show when={!chats.opts.screenshot}>Screenshot</Show>
            <Show when={chats.opts.screenshot}>
              <em>Loading, please wait...</em>
            </Show>
          </div>
        </Option>

        <MenuItemRow>
          <MenuItem onClick={() => props.setModal('members')} label="Party" icon={<Users />} />
          <MenuItem onClick={() => props.setModal('gen')} icon={<Sliders />} label="Preset" />
        </MenuItemRow>
        <MenuItemRow>
          <MenuItem onClick={props.toggleCharEditor} icon={<User />} label="Chara" />
          <MenuItem onClick={() => props.setModal('memory')} icon={<Book />} label="Memory" />
        </MenuItemRow>
      </Show>

      <MenuItemRow>
        <MenuItem
          onClick={() => props.setModal('settings')}
          icon={<Settings />}
          label="Chat"
          showWhen={isOwner()}
        />
        <MenuItem onClick={() => props.setModal('ui')} icon={<Palette />} label="UI" />
      </MenuItemRow>

      <MenuItemRow>
        <MenuItem onClick={() => props.setModal('export')} icon={<Download />} label="Export" />
        <MenuItem
          onClick={() => props.setModal('delete')}
          icon={<Trash />}
          label="Delete"
          showWhen={isOwner()}
        />
      </MenuItemRow>
    </div>
  )
}

const MenuItemRow: Component<{ children: JSX.Element }> = (props) => (
  <div class="flex gap-1">{props.children}</div>
)

const MenuItem: Component<{
  onClick: () => void
  icon: JSX.Element
  label: string
  showWhen?: boolean
}> = (props) => (
  <Show when={props.showWhen ?? true}>
    <Option
      onClick={props.onClick}
      class="flex flex-1 justify-start gap-2 hover:bg-[var(--bg-700)]"
    >
      {props.icon}
      {props.label}
    </Option>
  </Show>
)

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
    <Button schema="secondary" size="sm" onClick={onClick} alignLeft class={props.class}>
      {props.children}
    </Button>
  )
}

export default ChatOptions
