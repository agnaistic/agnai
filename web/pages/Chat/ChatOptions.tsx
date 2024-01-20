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
import { Card, TitleCard } from '/web/shared/Card'
import { useTransContext } from '@mbarzda/solid-i18next'

export type ChatModal =
  | 'export'
  | 'settings'
  | 'invite'
  | 'memory'
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
  const [t] = useTransContext()

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

  const isOwner = createMemo(
    () => chats.chat?.userId === user.user?._id && chats.chat?.mode !== 'companion'
  )

  const screenshotChat = async () => {
    if (chats.opts.screenshot) return
    const ele = document.getElementById('chat-messages')
    if (!ele) {
      toastStore.error(t('screenshot_failed_could_not_find_message_element'))
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
        toastStore.error(t('screenshot_failed_error_logged_in_console'))
        toggleScreenshot(false)
      })
  }

  return (
    <>
      <Show when={chats.chat?.mode}>
        <Card>{t('mode_x', { mode: chats.chat?.mode })}</Card>
      </Show>
      <div class="flex w-72 flex-col gap-2 p-2">
        <Show when={chats.members.length > 1}>
          <Option onClick={toggleOocMessages}>
            <div class="flex w-full items-center justify-between">
              <div>{t('hide_ooc_messages')}</div>
              <Toggle
                class="h-50 flex items-center"
                fieldName="editChat"
                value={chats.opts.hideOoc}
                onChange={toggleOocMessages}
              />
            </div>
          </Option>
        </Show>

        <Option onClick={toggleEditing} hide={!isOwner()}>
          <div class="flex w-full items-center justify-between">
            <div>{t('enable_chat_editing')}</div>
            <Toggle
              class="flex items-center"
              fieldName="editChat"
              value={chats.opts.editing}
              onChange={toggleEditing}
            />
          </div>
        </Option>

        <Option onClick={() => props.togglePane('character')} hide={!isOwner()}>
          <User /> {t('character')}
        </Option>

        <Option onClick={() => props.togglePane('participants')} hide={!isOwner()}>
          <Users /> {t('participants')}
        </Option>

        <Row>
          <Item onClick={() => props.togglePane('chat-settings')} hide={!isOwner()}>
            <Settings /> {t('edit_chat')}
          </Item>
          <Item onClick={() => props.togglePane('preset')} hide={!isOwner()}>
            <Sliders /> {t('preset')}
          </Item>
        </Row>
        <Row>
          <Item onClick={screenshotChat}>
            <Camera />
            <Show when={!chats.opts.screenshot}>{t('screenshot')}</Show>
            <Show when={chats.opts.screenshot}>
              <em>{t('loading_please_wait')}</em>
            </Show>
          </Item>
          <Item onClick={() => props.togglePane('memory')} hide={!isOwner()}>
            <Book /> {t('memory')}
          </Item>
        </Row>

        <Row>
          <Item
            schema={cfg.anonymize ? 'primary' : 'grey'}
            onClick={settingStore.toggleAnonymize}
          >
            <VenetianMask /> {t('anonymize')}
          </Item>
          <Item onClick={() => props.togglePane('ui')}>
            <Palette /> {t('ui')}
          </Item>
        </Row>

        <Row>
          <Item onClick={() => props.setModal('export')}>
            <Download /> {t('export')}
          </Item>
          <Item onClick={() => props.setModal('delete')} hide={!isOwner()}>
            <Trash /> {t('delete')}
          </Item>
        </Row>

        <Show when={chats.chat}>
          <Row>
            <Item onClick={() => setRestart(true)} center hide={!isOwner()}>
              <AlertTriangle /> {t('restart_chat')} <AlertTriangle />
            </Item>
          </Row>
        </Show>
        <div class="flex justify-center">
          <em class="text-sm">{props.adapterLabel}</em>
        </div>
      </div>
      <ConfirmModal
        message={
          <TitleCard type="rose" class="flex flex-col gap-4">
            <div class="flex justify-center font-bold">{t('are_you_sure?')}</div>
            <div>{t('this_will_delete_all_messages_in_this_conversation')}</div>
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
