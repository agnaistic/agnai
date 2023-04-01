import { A, useNavigate, useParams } from '@solidjs/router'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Book,
  ChevronLeft,
  ChevronRight,
  Download,
  MailPlus,
  Menu,
  Palette,
  Settings,
  Sliders,
  X,
} from 'lucide-solid'
import ChatExport from './ChatExport'
import { Component, createEffect, createMemo, createSignal, For, JSX, Show } from 'solid-js'
import { ADAPTER_LABELS } from '../../../common/adapters'
import { getAdapter } from '../../../common/prompt'
import Button from '../../shared/Button'
import IsVisible from '../../shared/IsVisible'
import Modal from '../../shared/Modal'
import TextInput from '../../shared/TextInput'
import { Toggle } from '../../shared/Toggle'
import { getRootRgb, getStrictForm } from '../../shared/util'
import { chatStore, settingStore, userStore } from '../../store'
import { AVATAR_SIZES, AvatarCornerRadius } from '../../store/user'
import * as UserStore from '../../store/user'
import { msgStore } from '../../store'
import { ChatGenSettingsModal } from './ChatGenSettings'
import ChatSettingsModal from './ChatSettings'
import InputBar from './components/InputBar'
import ChatMemoryModal from './components/MemoryModal'
import Message from './components/Message'
import PromptModal from './components/PromptModal'
import DeleteMsgModal from './DeleteMsgModal'
import './chat-detail.css'
import { DropMenu } from '../../shared/DropMenu'
import UISettings from '../Settings/UISettings'

const EDITING_KEY = 'chat-detail-settings'

type Modal = 'export' | 'settings' | 'invite' | 'memory' | 'gen' | 'ui'

const ChatDetail: Component = () => {
  const user = userStore()
  const cfg = settingStore()
  const chats = chatStore((s) => ({ ...s.active, lastId: s.lastChatId }))
  const msgs = msgStore((s) => ({
    msgs: s.msgs,
    partial: s.partial,
    waiting: s.waiting,
    retries: s.retries,
  }))

  const retries = createMemo(() => {
    const last = msgs.msgs.slice(-1)[0]
    if (!last) return

    const msgId = last._id

    return { msgId, list: msgs.retries?.[msgId] || [] }
  })

  const [swipe, setSwipe] = createSignal(0)
  const [removeId, setRemoveId] = createSignal('')
  const [showOpts, setShowOpts] = createSignal(false)
  const [modal, setModal] = createSignal<Modal>()
  const [editing, setEditing] = createSignal(getEditingState().editing ?? false)
  const { id } = useParams()
  const nav = useNavigate()

  function toggleEditing() {
    const next = !editing()
    setEditing(next)
    saveEditingState(next)
  }

  const showModal = (modal: Modal) => {
    console.log('modal', modal)
    setModal(modal)
    setShowOpts(false)
  }

  const clickSwipe = (dir: -1 | 1) => () => {
    const ret = retries()
    if (!ret || !ret.list.length) return
    const prev = swipe()
    const max = ret.list.length - 1

    let next = prev + dir
    if (next < 0) next = max
    else if (next > max) next = 0

    setSwipe(next)
  }

  const adapter = createMemo(() => {
    if (!chats.chat || !user.user) return ''
    const { adapter, preset } = getAdapter(chats.chat!, user.user!)
    const label = `${ADAPTER_LABELS[adapter]} - ${preset}`
    return label
  })

  createEffect(() => {
    if (!id) {
      if (!chats.lastId) return nav('/character/list')
      return nav(`/chat/${chats.lastId}`)
    }

    chatStore.getChat(id)
  })

  const sendMessage = (message: string, onSuccess?: () => void) => {
    if (isDevCommand(message)) {
      switch (message) {
        case '/devCycleAvatarSettings':
          devCycleAvatarSettings(user)
      }
    } else {
      setSwipe(0)
      msgStore.send(chats.chat?._id!, message, false, onSuccess)
    }
  }

  const moreMessage = (message: string) => {
    msgStore.continuation(chats.chat?._id!)
  }

  const cancelSwipe = () => {
    setSwipe(0)
  }

  const confirmSwipe = (msgId: string) => {
    msgStore.confirmSwipe(msgId, swipe(), () => setSwipe(0))
  }

  const headerBg = createMemo(() => {
    const rgb = getRootRgb('bg-900')
    const styles: JSX.CSSProperties = {
      background: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)`,
    }
    return styles
  })

  return (
    <>
      <Show when={!chats.chat || !chats.char || !user.profile}>
        <div>
          <div>Loading conversation...</div>
        </div>
      </Show>
      <Show when={chats.chat}>
        <div class="flex h-full flex-col justify-between sm:py-2 max-w-3xl mx-auto">
          <div class="flex h-8 items-center justify-between rounded-md" style={headerBg()}>
            <div class="flex cursor-pointer flex-row items-center justify-between gap-4 text-lg font-bold">
              <Show when={!cfg.fullscreen}>
                <A href={`/character/${chats.char?._id}/chats`}>
                  <ChevronLeft />
                </A>
                {chats.char?.name}
                <Show when={chats.chat?.name}>
                  <div class="flex flex-row items-center justify-between gap-4 text-sm">
                    {chats.chat?.name}
                  </div>
                </Show>
              </Show>
            </div>

            <div class="flex flex-row gap-3">
              <div class="hidden items-center text-xs italic text-[var(--text-500)] sm:flex">
                {adapter()}
              </div>

              <div class="" onClick={() => setShowOpts(true)}>
                <Menu class="icon-button" />
                <DropMenu
                  show={showOpts()}
                  close={() => setShowOpts(false)}
                  horz="left"
                  vert="down"
                >
                  <ChatOptions show={showModal} editing={editing()} toggleEditing={toggleEditing} />
                </DropMenu>
              </div>

              <Show when={!cfg.fullscreen}>
                <div class="icon-button" onClick={() => settingStore.fullscreen(true)}>
                  <ArrowUpRight />
                </div>
              </Show>

              <Show when={cfg.fullscreen}>
                <div class="icon-button" onClick={() => settingStore.fullscreen(false)}>
                  <ArrowDownLeft />
                </div>
              </Show>
            </div>
          </div>
          <div class="flex h-[calc(100%-32px)] flex-col-reverse gap-1">
            <InputBar
              chat={chats.chat!}
              swiped={swipe() !== 0}
              send={sendMessage}
              more={moreMessage}
            />
            <Show when={chats.chat?.userId === user.user?._id}>
              <SwipeMessage
                chatId={chats.chat?._id!}
                pos={swipe()}
                prev={clickSwipe(-1)}
                next={clickSwipe(1)}
                list={retries()?.list || []}
              />
            </Show>
            <div class="flex flex-col-reverse gap-4 overflow-y-scroll pr-2 sm:pr-4">
              <div class="flex flex-col gap-2">
                <For each={msgs.msgs}>
                  {(msg, i) => (
                    <Message
                      msg={msg}
                      chat={chats.chat!}
                      char={chats.char!}
                      editing={editing()}
                      last={i() >= 1 && i() === msgs.msgs.length - 1}
                      onRemove={() => setRemoveId(msg._id)}
                      swipe={
                        msg._id === retries()?.msgId && swipe() > 0 && retries()?.list[swipe()]
                      }
                      confirmSwipe={() => confirmSwipe(msg._id)}
                      cancelSwipe={cancelSwipe}
                    />
                  )}
                </For>
                <Show when={msgs.waiting}>
                  <div class="flex justify-center mt-3">
                    <div class="dot-flashing bg-[var(--hl-700)]"></div>
                  </div>
                </Show>
              </div>
              <InfiniteScroll />
            </div>
          </div>
        </div>
      </Show>

      <Show when={modal() === 'settings'}>
        <ChatSettingsModal show={true} close={setModal} />
      </Show>

      <Show when={modal() === 'gen'}>
        <ChatGenSettingsModal show={true} close={setModal} chat={chats.chat!} />
      </Show>

      <Show when={modal() === 'invite'}>
        <InviteModal show={true} close={setModal} chatId={chats.chat?._id!} />
      </Show>

      <Show when={modal() === 'memory'}>
        <ChatMemoryModal chat={chats.chat!} show={!!chats.chat} close={setModal} />
      </Show>

      <Show when={modal() === 'export'}>
        <ChatExport show={true} close={setModal} />
      </Show>

      <Show when={!!removeId()}>
        <DeleteMsgModal show={!!removeId()} messageId={removeId()} close={() => setRemoveId('')} />
      </Show>

      <PromptModal />
      <Show when={modal() === 'ui'}>
        <Modal
          show={true}
          close={setModal}
          title="UI Settings"
          footer={<Button onClick={setModal}>Close</Button>}
        >
          <UISettings />
        </Modal>
      </Show>
    </>
  )
}

export default ChatDetail

const ChatOptions: Component<{
  show: (modal: Modal) => void
  editing: boolean
  toggleEditing: () => void
}> = (props) => {
  const chats = chatStore((s) => ({ ...s.active, lastId: s.lastChatId }))
  const user = userStore()

  return (
    <div class="flex w-60 flex-col gap-2 p-2">
      <Show when={chats.chat?.userId === user.user?._id}>
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

        <Option
          onClick={() => props.show('invite')}
          class="flex justify-start gap-2 hover:bg-[var(--bg-700)]"
        >
          <MailPlus /> Invite User
        </Option>

        <Option
          onClick={() => props.show('memory')}
          class="flex justify-start gap-2 hover:bg-[var(--bg-700)]"
        >
          <Book />
          Edit Chat Memory
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

const InviteModal: Component<{ chatId: string; show: boolean; close: () => void }> = (props) => {
  let ref: any

  const save = () => {
    const body = getStrictForm(ref, { userId: 'string' })
    chatStore.inviteUser(props.chatId, body.userId, props.close)
  }

  return (
    <Modal
      show={props.show}
      close={props.close}
      title="Invite User to Conversation"
      footer={
        <>
          {' '}
          <Button size="sm" schema="secondary" onClick={props.close}>
            <X /> Cancel
          </Button>
          <Button size="sm" onClick={save}>
            <MailPlus /> Invite
          </Button>
        </>
      }
    >
      <form ref={ref} class="flex flex-col gap-2">
        <TextInput
          fieldName="userId"
          label="User ID"
          helperText="The ID of the user to invite. The user should provide this to you"
        />
      </form>
    </Modal>
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
    <Button schema="secondary" size="sm" onClick={onClick}>
      {props.children}
    </Button>
  )
}

const SwipeMessage: Component<{
  chatId: string
  list: string[]
  prev: () => void
  next: () => void
  pos: number
}> = (props) => {
  return (
    <div class="swipe">
      <div></div>
      <div class="swipe__content">
        <Show when={props.list.length > 1}>
          <div class="cursor:pointer hover:text-[var(--text-900)]">
            <Button schema="clear" class="p-0" onClick={props.prev}>
              <ChevronLeft />
            </Button>
          </div>
          <div class="text-[var(--text-800)]">
            {props.pos + 1} / {props.list.length}
          </div>
          <div class="cursor:pointer hover:text-[var(--text-800)]">
            <Button schema="clear" class="p-0" onClick={props.next}>
              <ChevronRight />
            </Button>
          </div>
        </Show>
      </div>
      <div></div>
    </div>
  )
}

const InfiniteScroll: Component = () => {
  const state = msgStore((s) => ({ loading: s.nextLoading, msgs: s.msgs }))
  const onEnter = () => {
    msgStore.getNextMessages()
  }

  return (
    <Show when={state.msgs.length > 0}>
      <div class="flex w-full justify-center">
        <Show when={!state.loading}>
          <IsVisible onEnter={onEnter} />
        </Show>
        <Show when={state.loading}>
          <div class="dot-flashing bg-[var(--hl-700)]"></div>
        </Show>
      </div>
    </Show>
  )
}

type DetailSettings = { editing?: boolean }

function saveEditingState(value: boolean) {
  const prev = getEditingState()
  localStorage.setItem(EDITING_KEY, JSON.stringify({ ...prev, editing: value }))
}

function getEditingState() {
  const prev = localStorage.getItem(EDITING_KEY) || '{}'
  const body = JSON.parse(prev) as DetailSettings
  return body
}

/* Magic strings for dev testing purposes. */
const devCommands = ['/devCycleAvatarSettings'] as const

type DevCommand = (typeof devCommands)[number]

const isDevCommand = (str: string): str is DevCommand => devCommands.some((cmd) => cmd === str)

const devCycleAvatarSettings = (user: UserStore.State) => {
  const originalSettings = {
    avatarCorners: user.ui.avatarCorners,
    avatarSize: user.ui.avatarSize,
  }
  const testedCornerSettings: AvatarCornerRadius[] = ['md', 'circle']
  const settingPermutations = testedCornerSettings.flatMap((avatarCorners) =>
    AVATAR_SIZES.map((avatarSize) => ({ avatarCorners, avatarSize }))
  )
  const applyPermutations = ([perm, ...rest]: (typeof settingPermutations)) => {
    if (perm === undefined) {
      console.log('Done demonstrating avatar setting permutations, restoring original settings')
      const { avatarCorners, avatarSize } = originalSettings
      userStore.updateUI({ avatarCorners, avatarSize })
    } else {
      console.log(perm)
      const { avatarCorners, avatarSize } = perm
      userStore.updateUI({ avatarCorners, avatarSize })
      setTimeout(() => applyPermutations(rest), 800)
    }
  }
  applyPermutations(settingPermutations)
}
