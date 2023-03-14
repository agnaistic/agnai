import { A, useNavigate, useParams } from '@solidjs/router'
import { ChevronLeft, ChevronRight, MailPlus, Settings, Sliders, X } from 'lucide-solid'
import { Component, createEffect, createMemo, createSignal, For, Show } from 'solid-js'
import { createMutable } from 'solid-js/store'
import { ADAPTER_LABELS } from '../../../common/adapters'
import { AppSchema } from '../../../srv/db/schema'
import Button from '../../shared/Button'
import Modal from '../../shared/Modal'
import SideDrawer from '../../shared/SideDrawer'
import TextInput from '../../shared/TextInput'
import Tooltip from '../../shared/Tooltip'
import { getStrictForm } from '../../shared/util'
import { chatStore, userStore } from '../../store'
import { msgStore } from '../../store/message'
import { ChatGenSettingsModal } from './ChatGenSettings'
import ChatSettingsModal from './ChatSettings'
import InputBar from './components/InputBar'
import Message from './components/Message'
import DeleteMsgModal from './DeleteMsgModal'

const ChatDetail: Component = () => {
  const user = userStore()

  const chats = chatStore((s) => ({ ...s.active, lastId: s.lastChatId }))

  const msgs = msgStore((s) => ({
    msgs: s.msgs,
    partial: s.partial,
    waiting: s.waiting,
    retries: s.retries?.list || [],
    swipeId: s.retries?.msgId,
  }))

  const [swipe, setSwipe] = createSignal(0)
  const [removeId, setRemoveId] = createSignal('')
  const [showMem, setShowMem] = createSignal(false)
  const [showGen, setShowGen] = createSignal(false)
  const [showConfig, setShowConfig] = createSignal(false)
  const [showInvite, setShowInvite] = createSignal(false)
  const { id } = useParams()
  const nav = useNavigate()

  const clickSwipe = (dir: -1 | 1) => () => {
    const prev = swipe()
    const max = msgs.retries.length - 1

    let next = prev + dir
    if (next < 0) next = max
    else if (next > max) next = 0

    console.log(msgs.retries[next])
    setSwipe(next)
  }

  const adapter = createMemo(() => {
    if (!chats.chat?.adapter || chats.chat?.adapter === 'default') return user.user?.defaultAdapter!
    return chats.chat.adapter!
  })

  createEffect(() => {
    if (!id) {
      if (!chats.lastId) return nav('/character/list')
      return nav(`/chat/${chats.lastId}`)
    }

    userStore.getProfile()
    userStore.getConfig()
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

  const confirmSwipe = () => {
    console.log('Confirming...')
    msgStore.confirmSwipe(swipe(), () => setSwipe(0))
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
                <ChevronLeft />
                {chats.char?.name}
              </div>
            </A>

            <div class="flex flex-row items-center gap-2">
              <div class="text-xs italic text-white/25">{ADAPTER_LABELS[adapter()]}</div>
              <div class="icon-button cursor-pointer" onClick={() => setShowInvite(true)}>
                <Tooltip tip="Invite user" position="bottom">
                  <MailPlus />
                </Tooltip>
              </div>

              <Show when={chats.chat?.userId === user.user?._id}>
                <div class="icon-button">
                  <Sliders onClick={() => setShowGen(true)} />
                </div>

                <div class="icon-button">
                  <Settings onClick={() => setShowConfig(true)} />
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
            <SwipeMessage
              chatId={chats.chat?._id!}
              pos={swipe()}
              prev={clickSwipe(-1)}
              next={clickSwipe(1)}
              list={msgs.retries}
            />
            <div class="flex flex-col-reverse gap-4 overflow-y-scroll">
              <div class="flex flex-col gap-2">
                <For each={msgs.msgs}>
                  {(msg, i) => (
                    <Message
                      msg={msg}
                      chat={chats.chat!}
                      char={chats.char!}
                      last={i() >= 1 && i() === msgs.msgs.length - 1}
                      onRemove={() => setRemoveId(msg._id)}
                      swipe={msg._id === msgs.swipeId && swipe() > 0 && msgs.retries[swipe()]}
                      confirmSwipe={confirmSwipe}
                      cancelSwipe={cancelSwipe}
                    />
                  )}
                </For>
                <Show when={msgs.partial}>
                  <Message
                    msg={emptyMsg(chats.char?._id!, msgs.partial!)}
                    char={chats.char!}
                    chat={chats.chat!}
                    onRemove={() => {}}
                  />
                </Show>
                <Show when={msgs.waiting}>
                  <div class="flex justify-center">
                    <div class="dot-flashing bg-[var(--hl-700)]"></div>
                  </div>
                </Show>
              </div>
            </div>
          </div>
        </div>
      </Show>
      <DeleteMsgModal show={!!removeId()} messageId={removeId()} close={() => setRemoveId('')} />
      <ChatSettingsModal show={showConfig()} close={() => setShowConfig(false)} />
      <ChatGenSettingsModal show={showGen()} close={() => setShowGen(false)} chat={chats.chat!} />
      <InviteModal
        show={showInvite()}
        close={() => setShowInvite(false)}
        chatId={chats.chat?._id!}
      />
      <SideDrawer show={showMem()} right>
        <div class="text-xl">Memory</div>
        <div>Work in progress</div>
      </SideDrawer>
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
    <div class="flex h-6 w-full items-center justify-between text-white/50">
      <Show when={props.list.length > 1}>
        <div class="cursor:pointer hover:text-white">
          <Button schema="clear" onClick={props.prev}>
            <ChevronLeft />
          </Button>
        </div>
        <div class="text-white/40">
          {props.pos + 1} / {props.list.length}
        </div>
        <div class="cursor:pointer hover:text-white">
          <Button schema="clear" onClick={props.next}>
            <ChevronRight />
          </Button>
        </div>
      </Show>
    </div>
  )
}

function emptyMsg(characterId: string, message: string): AppSchema.ChatMessage {
  return {
    kind: 'chat-message',
    _id: '',
    chatId: '',
    characterId,
    msg: message,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  }
}
