import { A, useNavigate, useParams } from '@solidjs/router'
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Menu } from 'lucide-solid'
import ChatExport from './ChatExport'
import { Component, createEffect, createMemo, createSignal, For, JSX, Show } from 'solid-js'
import { ADAPTER_LABELS } from '../../../common/adapters'
import Button from '../../shared/Button'
import IsVisible from '../../shared/IsVisible'
import Modal from '../../shared/Modal'
import { getRootRgb, setComponentPageTitle } from '../../shared/util'
import { chatStore, settingStore, UISettings as UI, userStore } from '../../store'
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
import { devCycleAvatarSettings, isDevCommand } from './dev-util'
import ChatOptions, { ChatModal } from './ChatOptions'
import MemberModal from './MemberModal'
import { AppSchema } from '../../../srv/db/schema'
import { ImageModal } from './ImageModal'
import { getClientPreset } from '../../shared/adapter'
import ForcePresetModal from './ForcePreset'

const EDITING_KEY = 'chat-detail-settings'

const ChatDetail: Component = () => {
  const { updateTitle } = setComponentPageTitle('Chat')
  const params = useParams()
  const nav = useNavigate()
  const user = userStore()
  const cfg = settingStore()
  const chats = chatStore((s) => ({
    ...s.active,
    lastId: s.lastChatId,
    members: s.chatProfiles,
    loaded: s.loaded,
  }))
  const msgs = msgStore((s) => ({
    msgs: insertImageMessages(s.msgs, s.images[params.id]),
    partial: s.partial,
    waiting: s.waiting,
    retries: s.retries,
  }))

  const [screenshotInProgress, setScreenshotInProgress] = createSignal(false)
  createEffect(() => {
    const charName = chats.char?.name
    updateTitle(charName ? `Chat with ${charName}` : 'Chat')
  })

  const retries = createMemo(() => {
    const last = msgs.msgs.slice(-1)[0]
    if (!last) return

    return { msgId: last._id, list: msgs.retries?.[last._id] || [] }
  })

  const [swipe, setSwipe] = createSignal(0)
  const [removeId, setRemoveId] = createSignal('')
  const [showOpts, setShowOpts] = createSignal(false)
  const [modal, setModal] = createSignal<ChatModal>()
  const [editing, setEditing] = createSignal(getEditingState().editing ?? false)

  const isOwner = createMemo(() => chats.chat?.userId === user.profile?.userId)
  const headerBg = createMemo(() => getHeaderBg(user.ui.mode))
  const chatWidth = createMemo(() => getChatWidth(user.ui.chatWidth))

  const isSelfRemoved = createMemo(() => {
    if (!user.profile) return false
    if (!chats.chat) return false

    const isMember =
      chats.chat.userId === user.profile.userId ||
      chats.members.some((mem) => mem.userId === user.profile?.userId)

    return !isMember
  })

  function toggleEditing() {
    const next = !editing()
    setEditing(next)
    saveEditingState(next)
  }

  const showModal = (modal: ChatModal) => {
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

  const chatPreset = createMemo(() => getClientPreset(chats.chat))

  const adapterLabel = createMemo(() => {
    const data = chatPreset()
    if (!data) return ''

    const { name, adapter, isThirdParty, presetLabel } = data

    const label = `${ADAPTER_LABELS[adapter]}${isThirdParty ? ' (3rd party)' : ''} - ${
      name || presetLabel
    }`
    return label
  })

  createEffect(() => {
    if (!params.id) {
      if (!chats.lastId) return nav('/character/list')
      return nav(`/chat/${chats.lastId}`)
    }

    chatStore.getChat(params.id)
  })

  const sendMessage = (message: string, onSuccess?: () => void) => {
    if (!isDevCommand(message)) {
      setSwipe(0)
      msgStore.send(chats.chat?._id!, message, 'send', onSuccess)
      return
    }

    switch (message) {
      case '/devCycleAvatarSettings':
        devCycleAvatarSettings(user)
        return
    }
  }

  const moreMessage = () => msgStore.continuation(chats.chat?._id!)

  const cancelSwipe = () => setSwipe(0)

  const confirmSwipe = (msgId: string) => {
    msgStore.confirmSwipe(msgId, swipe(), () => setSwipe(0))
  }

  // When html2canvas grabs this element to make a screenshot out
  // of it, we need to set the background otherwise it will render
  // as white/transparent resulting in unreadable message contents
  // if message background is set to 0 opacity
  const chatBg = () => (screenshotInProgress() ? 'bg-[var(--bg-900)]' : '')

  const generateFirst = () => {
    msgStore.retry(chats.chat?._id!)
  }

  return (
    <>
      <Show when={!chats.loaded}>
        <div>
          <div>Loading conversation...</div>
        </div>
      </Show>
      <Show when={chats.chat}>
        <div class={`mx-auto flex h-full ${chatWidth()} flex-col justify-between sm:py-2`}>
          <div class="flex h-9 items-center justify-between rounded-md" style={headerBg()}>
            <div class="ellipsis flex max-w-full cursor-pointer flex-row items-center justify-between gap-4 text-lg font-bold">
              <Show when={!cfg.fullscreen && isOwner()}>
                <A href={`/character/${chats.char?._id}/chats`}>
                  <ChevronLeft />
                </A>
                <div class="ellipsis flex flex-col">
                  <span class="overflow-hidden text-ellipsis whitespace-nowrap leading-5">
                    {chats.char?.name}
                  </span>
                  <Show when={chats.chat?.name}>
                    <span class="flex-row items-center gap-4 overflow-hidden text-ellipsis whitespace-nowrap text-sm">
                      {chats.chat?.name}
                    </span>
                  </Show>
                </div>
              </Show>
            </div>

            <div class="flex flex-row gap-3">
              <Show when={isOwner()}>
                <div class="hidden items-center text-xs italic text-[var(--text-500)] sm:flex">
                  {adapterLabel()}
                </div>
              </Show>

              <div class="" onClick={() => setShowOpts(true)}>
                <Menu class="icon-button" />
                <DropMenu
                  show={showOpts()}
                  close={() => setShowOpts(false)}
                  horz="left"
                  vert="down"
                >
                  <ChatOptions
                    show={showModal}
                    editing={editing()}
                    toggleEditing={toggleEditing}
                    screenshotInProgress={screenshotInProgress()}
                    setScreenshotInProgress={setScreenshotInProgress}
                  />
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

          <div class="flex h-[calc(100%-36px)] flex-col-reverse gap-1">
            <InputBar
              chat={chats.chat!}
              swiped={swipe() !== 0}
              send={sendMessage}
              more={moreMessage}
            />
            <Show when={isOwner()}>
              <SwipeMessage
                chatId={chats.chat?._id!}
                pos={swipe()}
                prev={clickSwipe(-1)}
                next={clickSwipe(1)}
                list={retries()?.list || []}
              />
            </Show>
            <Show when={isSelfRemoved()}>
              <div class="flex w-full justify-center">
                You have been removed from the conversation
              </div>
            </Show>
            <div class="flex flex-col-reverse gap-4 overflow-y-scroll">
              <div id="chat-messages" class={`flex flex-col gap-2 ${chatBg()}`}>
                <Show when={chats.loaded && msgs.msgs.length === 0 && !msgs.waiting}>
                  <div class="flex justify-center">
                    <Button onClick={generateFirst}>Generate Message</Button>
                  </div>
                </Show>
                <For each={msgs.msgs}>
                  {(msg, i) => (
                    <Message
                      msg={msg}
                      chat={chats.chat!}
                      char={chats.char!}
                      editing={editing()}
                      anonymize={cfg.anonymize}
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
                  <Message
                    msg={emptyMsg({
                      charId: msgs.waiting?.mode !== 'self' ? chats.char?._id : undefined,
                      userId:
                        msgs.waiting?.mode === 'self'
                          ? msgs.waiting.userId || user.user?._id
                          : undefined,
                      message: '',
                    })}
                    char={chats.char!}
                    chat={chats.chat!}
                    onRemove={() => {}}
                    editing={editing()}
                    anonymize={cfg.anonymize}
                  />
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

      <Show when={modal() === 'memory'}>
        <ChatMemoryModal chat={chats.chat!} show={!!chats.chat} close={setModal} />
      </Show>

      <Show when={modal() === 'export'}>
        <ChatExport show={true} close={setModal} />
      </Show>

      <Show when={!!removeId()}>
        <DeleteMsgModal show={!!removeId()} messageId={removeId()} close={() => setRemoveId('')} />
      </Show>

      <Show when={modal() === 'members'}>
        <MemberModal show={true} close={setModal} />
      </Show>

      <ImageModal />

      <Show
        when={
          chats.chat &&
          !chats.chat.genPreset &&
          !chats.chat.genSettings &&
          !user.user?.defaultPreset
        }
      >
        <ForcePresetModal chat={chats.chat!} show={true} close={() => {}} />
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

function getChatWidth(setting: UI['chatWidth']) {
  switch (setting) {
    case 'narrow':
      return 'max-w-3xl'

    case 'full':
    default:
      return 'w-full max-w-full'
  }
}

function getHeaderBg(mode: UI['mode']) {
  mode
  const rgb = getRootRgb('bg-900')
  const styles: JSX.CSSProperties = {
    background: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)`,
  }
  return styles
}
function emptyMsg(opts: {
  charId?: string
  userId?: string
  message: string
}): AppSchema.ChatMessage {
  return {
    kind: 'chat-message',
    _id: '',
    chatId: '',
    characterId: opts.charId,
    userId: opts.userId,
    msg: opts.message || '',
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  }
}

function insertImageMessages(
  msgs: AppSchema.ChatMessage[],
  images: AppSchema.ChatMessage[] | undefined
) {
  if (!images?.length) return msgs

  const next: AppSchema.ChatMessage[] = []

  const inserts = images.slice()

  for (const msg of msgs) {
    if (!inserts.length) {
      next.push(msg)
      continue
    }

    do {
      if (!inserts.length) break
      if (msg.createdAt < inserts[0].createdAt) break
      if (msg._id === inserts[0]._id) {
        inserts.shift()
        continue
      }
      next.push(inserts.shift()!)
    } while (true)

    next.push(msg)
  }

  if (inserts.length) {
    next.push(...inserts)
  }

  return next
}
