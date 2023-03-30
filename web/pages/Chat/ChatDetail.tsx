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
  Settings,
  Sliders,
  X,
} from 'lucide-solid'
import ChatExport from './ChatExport'
import { Component, createEffect, createMemo, createSignal, For, Show } from 'solid-js'
import { ADAPTER_LABELS } from '../../../common/adapters'
import { getAdapter } from '../../../common/prompt'
import Button from '../../shared/Button'
import IsVisible from '../../shared/IsVisible'
import Modal from '../../shared/Modal'
import TextInput from '../../shared/TextInput'
import { Toggle } from '../../shared/Toggle'
import { getStrictForm } from '../../shared/util'
import { chatStore, settingStore, userStore } from '../../store'
import { msgStore } from '../../store'
import { ChatGenSettingsModal } from './ChatGenSettings'
import ChatSettingsModal from './ChatSettings'
import InputBar from './components/InputBar'
import ChatMemoryModal from './components/MemoryModal'
import Message from './components/Message'
import PromptModal from './components/PromptModal'
import DeleteMsgModal from './DeleteMsgModal'
import './chat-detail.css'

const EDITING_KEY = 'chat-detail-settings'

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
  const [showMem, setShowMem] = createSignal(false)
  const [showOpts, setShowOpts] = createSignal(false)
  const [showGen, setShowGen] = createSignal(false)
  const [showConfig, setShowConfig] = createSignal(false)
  const [showInvite, setShowInvite] = createSignal(false)
  const [showExport, setShowExport] = createSignal(false)
  const [editing, setEditing] = createSignal(getEditingState().editing ?? false)
  const { id } = useParams()
  const nav = useNavigate()

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
    setSwipe(0)
    msgStore.send(chats.chat?._id!, message, false, onSuccess)
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

  function toggleEditing() {
    const next = !editing()
    setEditing(next)
    saveEditingState(next)
  }

  return (
    <>
      <Show when={!chats.chat || !chats.char || !user.profile}>
        <div>
          <div>Loading conversation...</div>
        </div>
      </Show>
      <Show when={chats.chat}>
        <div class="flex h-full flex-col justify-between sm:py-2">
          <div class="flex h-8 items-center justify-between ">
            <div class="flex cursor-pointer flex-row items-center justify-between gap-4 text-lg font-bold">
              <Show when={!cfg.fullscreen}>
                <A href={`/character/${chats.char?._id}/chats`}>
                  <ChevronLeft />
                </A>
                {chats.char?.name}
              </Show>
            </div>

            <div class="flex flex-row gap-3">
              <div class="hidden items-center text-xs italic text-[var(--text-500)] sm:flex">
                {adapter()}
              </div>

              <div class="icon-button" onClick={() => setShowOpts(!showOpts())}>
                <Menu />
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
          <div class="flex h-[calc(100%-32px)] flex-col-reverse">
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
            <div class="flex flex-col-reverse gap-4 overflow-y-scroll">
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
                  <div class="flex justify-center">
                    <div class="dot-flashing bg-[var(--hl-700)]"></div>
                  </div>
                </Show>
              </div>
              <InfiniteScroll />
            </div>
          </div>
        </div>
      </Show>

      <Show when={!!removeId()}>
        <DeleteMsgModal show={!!removeId()} messageId={removeId()} close={() => setRemoveId('')} />
      </Show>

      <Show when={showConfig()}>
        <ChatSettingsModal show={showConfig()} close={() => setShowConfig(false)} />
      </Show>

      <Show when={showGen()}>
        <ChatGenSettingsModal show={showGen()} close={() => setShowGen(false)} chat={chats.chat!} />
      </Show>

      <Show when={showInvite()}>
        <InviteModal
          show={showInvite()}
          close={() => setShowInvite(false)}
          chatId={chats.chat?._id!}
        />
      </Show>

      <PromptModal />

      <Modal
        show={showOpts()}
        close={() => setShowOpts(false)}
        title="Chat Options"
        footer={
          <>
            <Button schema="secondary" onClick={() => setShowOpts(false)}>
              Close
            </Button>
          </>
        }
      >
        <div class="flex flex-col gap-2">
          <Show when={chats.chat?.userId === user.user?._id}>
            <Option onClick={toggleEditing}>
              <div class="flex w-full items-center justify-between">
                <div>Enable Chat Editing</div>
                <Toggle
                  class="flex items-center"
                  fieldName="editChat"
                  value={editing()}
                  onChange={toggleEditing}
                />
              </div>
            </Option>

            <Option
              onClick={() => setShowInvite(true)}
              close={() => setShowOpts(false)}
              class="flex justify-start gap-2 hover:bg-[var(--bg-700)]"
            >
              <MailPlus /> Invite User
            </Option>

            <Option
              onClick={() => setShowMem(true)}
              close={() => setShowOpts(false)}
              class="flex justify-start gap-2 hover:bg-[var(--bg-700)]"
            >
              <Book />
              Edit Chat Memory
            </Option>

            <Option
              onClick={() => setShowGen(true)}
              close={() => setShowOpts(false)}
              class="flex justify-start gap-2 hover:bg-[var(--bg-700)]"
            >
              <Sliders /> Generation Settings
            </Option>

            <Option
              onClick={() => setShowConfig(true)}
              close={() => setShowOpts(false)}
              class="flex justify-start gap-2 hover:bg-[var(--bg-700)]"
            >
              <Settings /> Chat Settings
            </Option>
          </Show>

          <Option
            onClick={() => setShowExport(true)}
            close={() => setShowOpts(false)}
            class="flex justify-start gap-2 hover:bg-[var(--bg-700)]"
          >
            <Download /> Export Chat
          </Option>
        </div>
      </Modal>

      <Show when={showMem()}>
        <ChatMemoryModal
          chat={chats.chat!}
          show={!!chats.chat && showMem()}
          close={() => setShowMem(false)}
        />
      </Show>

      <Show when={showExport()}>
        <ChatExport show={showExport()} close={() => setShowExport(false)} />
      </Show>
    </>
  )
}

export default ChatDetail

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
    <div
      class={`flex w-full cursor-pointer select-none rounded-md bg-[var(--hl-900)] py-2 px-4 hover:bg-[var(--hl-800)] ${
        props.class || ''
      }`}
      onClick={onClick}
    >
      {props.children}
    </div>
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
    <div class="flex h-6 min-h-[1.5rem] w-full items-center justify-between text-[var(--text-800)]">
      <Show when={props.list.length > 1}>
        <div class="cursor:pointer hover:text-[var(--text-900)]">
          <Button schema="clear" onClick={props.prev}>
            <ChevronLeft />
          </Button>
        </div>
        <div class="text-[var(--text-800)]">
          {props.pos + 1} / {props.list.length}
        </div>
        <div class="cursor:pointer hover:text-[var(--text-800)]">
          <Button schema="clear" onClick={props.next}>
            <ChevronRight />
          </Button>
        </div>
      </Show>
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
