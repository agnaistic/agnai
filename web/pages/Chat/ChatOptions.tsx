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
  VenetianMask,
  AlertTriangle,
} from 'lucide-solid'
import { Component, Show, createMemo, JSX, createSignal } from 'solid-js'
import Button, { ButtonSchema } from '../../shared/Button'
import { Toggle } from '../../shared/Toggle'
import { ChatRightPane, chatStore, settingStore, toastStore, userStore } from '../../store'
import { domToPng } from 'modern-screenshot'
import { getRootRgb } from '../../shared/util'
import { ConfirmModal } from '/web/shared/Modal'
import { TitleCard } from '/web/shared/Card'

export type ChatModal =
  | 'export'
  | 'settings'
  | 'invite'
  | 'memory'
  | 'ui'
  | 'members'
  | 'delete'
  | 'updateGaslightToUseSystemPrompt'
  | 'none'

const ChatOptions: Component<{
  adapterLabel: string
  setModal: (modal: ChatModal) => void
  togglePane: (pane: ChatRightPane) => void
  close: () => void
}> = (props) => {
  const chats = chatStore((s) => ({
    ...s.active,
    opts: s.opts,
    members: s.chatProfiles,
  }))
  const user = userStore()
  const cfg = settingStore()

  const [restart, setRestart] = createSignal(false)

  const toggleOocMessages = () => {
    chatStore.option('hideOoc', !chats.opts.hideOoc)
  }

  const toggleEditing = () => {
    chatStore.option('editing', !chats.opts.editing)
  }

  const toggleScreenshot = (value: boolean) => {
    chatStore.option('screenshot', value)
  }

  const isOwner = createMemo(() => chats.chat?.userId === user.user?._id && chats.chat?.mode !== 'companion')

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
      style: {
        fontSize: '0.9em',
      },
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
    <>
      <div class="flex w-72 flex-col gap-2 p-2">
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

          <Option onClick={() => props.togglePane('character')}>
            <User /> Character
          </Option>

          <Option onClick={() => props.setModal('members')}>
            <Users /> Participants
          </Option>

          <MenuItemRow>
            <MenuItem onClick={() => props.setModal('settings')} hide={!isOwner()}>
              <Settings /> Edit Chat
            </MenuItem>
            <MenuItem onClick={() => props.togglePane('preset')}>
              <Sliders /> Preset
            </MenuItem>
          </MenuItemRow>
          <MenuItemRow>
            <MenuItem onClick={screenshotChat}>
              <Camera />
              <Show when={!chats.opts.screenshot}>Screenshot</Show>
              <Show when={chats.opts.screenshot}>
                <em>Loading, please wait...</em>
              </Show>
            </MenuItem>
            <MenuItem onClick={() => props.setModal('memory')}>
              <Book /> Memory
            </MenuItem>
          </MenuItemRow>
        </Show>

        <MenuItemRow>
          <MenuItem schema={cfg.anonymize ? 'primary' : undefined} onClick={settingStore.toggleAnonymize}>
            <VenetianMask /> Anonymize
          </MenuItem>
          <MenuItem onClick={() => props.setModal('ui')}>
            <Palette /> UI
          </MenuItem>
        </MenuItemRow>

        <MenuItemRow>
          <MenuItem onClick={() => props.setModal('export')}>
            <Download /> Export
          </MenuItem>
          <MenuItem onClick={() => props.setModal('delete')} hide={!isOwner()}>
            <Trash /> Delete
          </MenuItem>
        </MenuItemRow>

        <Show when={chats.chat}>
          <MenuItemRow>
            <MenuItem onClick={() => setRestart(true)} center>
              <AlertTriangle /> Restart Chat <AlertTriangle />
            </MenuItem>
          </MenuItemRow>
        </Show>
        <div class="flex justify-center">
          <em class="text-sm">{props.adapterLabel}</em>
        </div>
      </div>
      <ConfirmModal
        message={
          <TitleCard type="rose" class="flex flex-col gap-4">
            <div class="flex justify-center font-bold">Are you sure?</div>
            <div>This will delete ALL messages in this conversation.</div>
          </TitleCard>
        }
        show={restart()}
        close={() => setRestart(false)}
        confirm={() => {
          chatStore.restartChat(chats.chat!._id)
          props.close()
        }}
      />
    </>
  )
}

const MenuItemRow: Component<{ children: JSX.Element }> = (props) => <div class="flex gap-1">{props.children}</div>

const MenuItem: Component<{
  onClick: () => void
  schema?: ButtonSchema
  hide?: boolean
  children: any
  center?: boolean
}> = (props) => (
  <Show when={!props.hide}>
    <Option
      onClick={props.onClick}
      class={`flex flex-1 ${props.center ? 'justify-center' : 'justify-start'} gap-2 hover:bg-[var(--bg-700)]`}
      schema={props.schema}
    >
      {props.children}
    </Option>
  </Show>
)

const Option: Component<{
  children: any
  class?: string
  schema?: ButtonSchema
  onClick: () => void
  close?: () => void
}> = (props) => {
  const onClick = () => {
    props.onClick()
    props.close?.()
  }
  return (
    <Button schema={props.schema || 'secondary'} size="sm" onClick={onClick} alignLeft class={props.class}>
      {props.children}
    </Button>
  )
}

export default ChatOptions
