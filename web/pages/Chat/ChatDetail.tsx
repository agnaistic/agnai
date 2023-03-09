import { A, useNavigate, useParams } from '@solidjs/router'
import { ChevronLeft, MailPlus, Settings, Sliders, X } from 'lucide-solid'
import { Component, createEffect, createSignal, For, Show } from 'solid-js'
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
import Message, { SplitMessage } from './components/Message'
import DeleteMsgModal from './DeleteMsgModal'

const ChatDetail: Component = () => {
  const user = userStore()

  const chats = chatStore((s) => ({ ...s.active, lastId: s.lastChatId }))

  const msgs = msgStore((s) => ({
    msgs: s.msgs,
    partial: s.partial,
    waiting: s.waiting,
  }))

  const [removeId, setRemoveId] = createSignal('')
  const [showMem, setShowMem] = createSignal(false)
  const [showGen, setShowGen] = createSignal(false)
  const [showConfig, setShowConfig] = createSignal(false)
  const [showInvite, setShowInvite] = createSignal(false)
  const { id } = useParams()
  const nav = useNavigate()

  createEffect(() => {
    if (!id) {
      if (!chats.lastId) return nav('/character/list')
      return nav(`/chat/${chats.lastId}`)
    }

    userStore.getProfile()
    userStore.getConfig()
    chatStore.getChat(id)
  })

  return (
    <>
      <Show when={!chats.chat || !chats.char || !user.profile}>
        <div>
          <div>Loading conversation...</div>
        </div>
      </Show>
      <Show when={chats.chat}>
        <div class="mb-4 flex h-full flex-col justify-between pb-4">
          <div class="flex items-center justify-between">
            <A href={`/character/${chats.char?._id}/chats`}>
              <div class="flex h-8 cursor-pointer flex-row items-center justify-between gap-4 text-lg font-bold">
                <ChevronLeft />
                {chats.char?.name}
              </div>
            </A>

            <div class="flex flex-row gap-2">
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
          <div class="flex h-full flex-col-reverse">
            <InputBar chat={chats.chat!} />
            <div class="flex flex-col-reverse overflow-y-scroll">
              <div class="flex flex-col gap-4 pt-4 pb-4">
                <For each={msgs.msgs}>
                  {(msg, i) => (
                    <Message
                      msg={msg}
                      chat={chats.chat!}
                      char={chats.char!}
                      last={i() >= 1 && i() === msgs.msgs.length - 1}
                      onRemove={() => setRemoveId(msg._id)}
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

function splitMessage(
  char: AppSchema.Character,
  profile: AppSchema.Profile,
  msg: AppSchema.ChatMessage
): SplitMessage[] {
  const CHARS = [`${char.name}:`, `{{char}}:`]
  const USERS = [`${profile.handle || 'You'}:`, `{{user}}:`]

  const next: AppSchema.ChatMessage[] = []

  const splits = msg.msg.split('\n')
  if (splits.length === 1) {
    next.push(msg)
  }

  for (const split of splits) {
    const trim = split.trim()
    let newMsg: AppSchema.ChatMessage | undefined

    for (const CHAR of CHARS) {
      if (newMsg) break
      if (trim.startsWith(CHAR)) {
        newMsg = { ...msg, msg: trim.replace(CHAR, ''), characterId: char._id, userId: undefined }
        break
      }
    }

    for (const USER of USERS) {
      if (newMsg) break
      if (trim.startsWith(USER)) {
        newMsg = {
          ...msg,
          msg: trim.replace(USER, ''),
          userId: profile.userId,
          characterId: undefined,
        }
        break
      }
    }

    if (!next.length && !newMsg) return [msg]

    if (!newMsg) {
      const lastMsg = next.slice(-1)[0]
      lastMsg.msg += ` ${trim}`
      continue
    }

    next.push(newMsg)
    continue
  }

  if (!next.length || next.length === 1) return [msg]
  const newSplits = next.map((next) => ({ ...next, split: true }))
  return newSplits
}
