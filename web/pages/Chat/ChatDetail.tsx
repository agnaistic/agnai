import { A, useNavigate, useParams } from '@solidjs/router'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Book,
  ChevronLeft,
  ChevronRight,
  MailPlus,
  Settings,
  Sliders,
  ToggleLeft,
  ToggleRight,
  X,
} from 'lucide-solid'
import { Component, createEffect, createMemo, createSignal, For, Show } from 'solid-js'
import { ADAPTER_LABELS } from '../../../common/adapters'
import { getAdapter } from '../../../common/prompt'
import Button from '../../shared/Button'
import IsVisible from '../../shared/IsVisible'
import Modal from '../../shared/Modal'
import TextInput from '../../shared/TextInput'
import Tooltip from '../../shared/Tooltip'
import { getStrictForm } from '../../shared/util'
import { chatStore, settingStore, userStore } from '../../store'
import { memoryStore } from '../../store'
import { msgStore } from '../../store'
import { ChatGenSettingsModal } from './ChatGenSettings'
import ChatSettingsModal from './ChatSettings'
import InputBar from './components/InputBar'
import ChatMemoryModal from './components/MemoryModal'
import Message from './components/Message'
import PromptModal from './components/PromptModal'
import DeleteMsgModal from './DeleteMsgModal'

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

  const memory = memoryStore((s) => ({
    book: s.books.list.find((bk) => chats.chat?.memoryId === bk._id),
    loaded: s.books.loaded,
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
  const [showGen, setShowGen] = createSignal(false)
  const [showConfig, setShowConfig] = createSignal(false)
  const [showInvite, setShowInvite] = createSignal(false)
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

  const sendMessage = (message: string) => {
    setSwipe(0)
    msgStore.send(chats.chat?._id!, message)
  }

  const moreMessage = (message: string) => {
    msgStore.retry(chats.chat?._id!, message)
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
            <A href={`/character/${chats.char?._id}/chats`}>
              <div class="flex cursor-pointer flex-row items-center justify-between gap-4 text-lg font-bold">
                <Show when={!cfg.fullscreen}>
                  <ChevronLeft />
                  {chats.char?.name}
                </Show>
              </div>
            </A>

            <div class="flex flex-row gap-3">
              <div class="hidden items-center text-xs italic text-[var(--text-500)] sm:flex">
                {adapter()}
              </div>
              <div class="icon-button" onClick={toggleEditing}>
                <Tooltip tip="Toggle edit mode">
                  <Show when={editing()}>
                    <ToggleRight class="text-[var(--hl-500)]" />
                  </Show>
                  <Show when={!editing()}>
                    <ToggleLeft />
                  </Show>
                </Tooltip>
              </div>
              <div class="icon-button" onClick={() => setShowInvite(true)}>
                <Tooltip tip="Invite user" position="bottom">
                  <MailPlus />
                </Tooltip>
              </div>

              <Show when={chats.chat?.userId === user.user?._id}>
                <div class="icon-button">
                  <Book
                    onClick={() => {
                      setShowMem(!showMem())
                      console.log(memory.book, showMem())
                    }}
                  />
                </div>
                <div class="icon-button">
                  <Sliders onClick={() => setShowGen(true)} />
                </div>

                <div class="icon-button">
                  <Settings onClick={() => setShowConfig(true)} />
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
            <SwipeMessage
              chatId={chats.chat?._id!}
              pos={swipe()}
              prev={clickSwipe(-1)}
              next={clickSwipe(1)}
              list={retries()?.list || []}
            />
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

      <Show when={chats.chat}>
        <ChatMemoryModal
          chat={chats.chat!}
          book={memory.book}
          show={!!chats.chat && showMem()}
          close={() => setShowMem(false)}
        />
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

const SwipeMessage: Component<{
  chatId: string
  list: string[]
  prev: () => void
  next: () => void
  pos: number
}> = (props) => {
  return (
    <div class="flex h-6 w-full items-center justify-between text-[var(--text-800)]">
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

const EDITING_KEY = 'chat-detail-settings'
function saveEditingState(value: boolean) {
  const prev = getEditingState()
  localStorage.setItem(EDITING_KEY, JSON.stringify({ ...prev, editing: value }))
}

function getEditingState() {
  const prev = localStorage.getItem(EDITING_KEY) || '{}'
  const body = JSON.parse(prev) as DetailSettings
  return body
}
