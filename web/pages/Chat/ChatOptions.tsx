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
  Map,
} from 'lucide-solid'
import { Component, Show, createMemo, JSX } from 'solid-js'
import Button, { ButtonSchema } from '../../shared/Button'
import { Toggle } from '../../shared/Toggle'
import { ChatRightPane, chatStore, settingStore, toastStore, userStore } from '../../store'
import { domToPng } from 'modern-screenshot'
import { Card } from '/web/shared/Card'
import { getRootRgb } from '/web/shared/colors'

export type ChatModal =
  | 'export'
  | 'settings'
  | 'invite'
  | 'memory'
  | 'members'
  | 'delete'
  | 'none'
  | 'graph'
  | 'restart'

const ChatOptions: Component<{
  adapterLabel: string
  setModal: (modal: ChatModal) => void
  togglePane: (pane: ChatRightPane) => void
}> = (props) => {
  const chats = chatStore((s) => ({
    ...s.active,
    opts: s.opts,
    members: s.chatProfiles,
  }))
  const user = userStore()
  const cfg = settingStore()

  const toggleOocMessages = () => {
    chatStore.option({ hideOoc: !chats.opts.hideOoc })
  }

  const toggleScreenshot = (value: boolean) => {
    chatStore.option({ screenshot: value })
  }

  const isOwner = createMemo(
    () => chats.chat?.userId === user.user?._id && chats.chat?.mode !== 'companion'
  )

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
      <Show when={chats.chat?.mode}>
        <Card>Mode: {chats.chat?.mode}</Card>
      </Show>
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

        <Option onClick={() => props.togglePane('character')} hide={!isOwner()}>
          <User /> Main Character
        </Option>

        <Option onClick={() => props.togglePane('participants')} hide={!isOwner()}>
          <Users /> Participants
        </Option>

        <Row>
          <Item onClick={() => props.togglePane('chat-settings')} hide={!isOwner()}>
            <Settings /> Edit Chat
          </Item>
          <Item onClick={() => props.togglePane('preset')} hide={!isOwner()}>
            <Sliders /> Preset
          </Item>
        </Row>
        <Row>
          <Item onClick={screenshotChat}>
            <Camera />
            <Show when={!chats.opts.screenshot}>Screenshot</Show>
            <Show when={chats.opts.screenshot}>
              <em>Loading, please wait...</em>
            </Show>
          </Item>
          <Item onClick={() => props.togglePane('memory')} hide={!isOwner()}>
            <Book /> Memory
          </Item>
        </Row>

        <Row>
          <Item schema={cfg.anonymize ? 'primary' : 'grey'} onClick={settingStore.toggleAnonymize}>
            <VenetianMask /> Anonymize
          </Item>
          <Item onClick={() => props.togglePane('ui')}>
            <Palette /> UI
          </Item>
        </Row>

        <Row>
          <Item onClick={() => props.setModal('export')}>
            <Download /> Export
          </Item>
          <Item onClick={() => props.setModal('delete')} hide={!isOwner()}>
            <Trash /> Delete
          </Item>
        </Row>

        <Show when={chats.chat}>
          <Row>
            <Item
              onClick={() => {
                props.setModal('graph')
              }}
            >
              <Map />
              Chat Graph
            </Item>
            <Item
              onClick={() => {
                chatStore.option({ confirm: true, options: false })
              }}
              hide={!isOwner()}
            >
              <AlertTriangle /> Restart <AlertTriangle />
            </Item>
          </Row>
        </Show>
        <div class="flex justify-center">
          <em class="text-sm">{props.adapterLabel}</em>
        </div>
      </div>
    </>
  )
}

const Row: Component<{ children: JSX.Element; hide?: boolean }> = (props) => (
  <Show when={!props.hide}>
    <div class="flex gap-1">{props.children}</div>
  </Show>
)

const Item: Component<{
  onClick: () => void
  schema?: ButtonSchema
  hide?: boolean
  children: any
  center?: boolean
}> = (props) => (
  <Show when={!props.hide}>
    <Option
      onClick={props.onClick}
      class={`flex flex-1 ${
        props.center ? 'justify-center' : 'justify-start'
      } gap-2 hover:bg-[var(--bg-700)]`}
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
  hide?: boolean
}> = (props) => {
  const onClick = () => {
    props.onClick()
    props.close?.()
  }
  return (
    <Show when={!props.hide}>
      <Button
        schema={props.schema || 'secondary'}
        size="sm"
        onClick={onClick}
        alignLeft
        class={props.class}
      >
        {props.children}
      </Button>
    </Show>
  )
}

export default ChatOptions
