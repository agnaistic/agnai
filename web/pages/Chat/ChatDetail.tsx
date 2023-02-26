import { A, useNavigate, useParams } from '@solidjs/router'
import { ChevronLeft } from 'lucide-solid'
import { Component, createEffect, createSignal, For, Show } from 'solid-js'
import { AppSchema } from '../../../srv/db/schema'
import PageHeader from '../../shared/PageHeader'
import { chatStore } from '../../store'
import { msgStore } from '../../store/message'
import ChatSettingsModal from './ChatSettings'
import Header from './components/Header'
import InputBar from './components/InputBar'
import Message from './components/Message'
import DeleteMsgModal from './DeleteMsgModal'

const ChatDetail: Component = () => {
  const chats = chatStore((s) => ({
    chat: s.active,
    character: s.character,
    lastId: s.lastChatId,
  }))

  const msgs = msgStore((s) => ({
    msgs: s.msgs,
    partial: s.partial,
    waiting: s.waiting,
  }))

  const [removeId, setRemoveId] = createSignal('')
  const [showConfig, setShowConfig] = createSignal(false)
  const { id } = useParams()
  const nav = useNavigate()

  createEffect(() => {
    if (!id) {
      if (!chats.lastId) return nav('/character/list')
      return nav(`/chat/${chats.lastId}`)
    }

    chatStore.getChat(id)
  })

  return (
    <>
      <Show when={!chats.chat}>
        <div>
          <div>Loading conversation...</div>
        </div>
      </Show>
      <Show when={chats.chat}>
        <div class="mb-4 flex h-full flex-col justify-between pb-4">
          <div class="flex h-full flex-col-reverse">
            <InputBar chatId={chats.chat!._id} openConfig={() => setShowConfig(true)} />
            <div class="flex flex-col-reverse overflow-y-scroll">
              <div class="flex flex-col gap-4 pt-4 pb-4">
                <For each={msgs.msgs}>
                  {(msg, i) => (
                    <Message
                      msg={msg}
                      chat={chats.chat}
                      char={chats.character}
                      last={i() >= 1 && i() === msgs.msgs.length - 1}
                      onRemove={() => setRemoveId(msg._id)}
                    />
                  )}
                </For>
                <Show when={msgs.partial}>
                  <Message
                    msg={emptyMsg(chats.character?._id!, msgs.partial!)}
                    char={chats.character}
                    chat={chats.chat}
                    onRemove={() => {}}
                  />
                </Show>
                <Show when={msgs.waiting}>
                  <div class="flex justify-center">
                    <div class="dot-flashing bg-purple-700"></div>
                  </div>
                </Show>
              </div>
              <Header participants={[chats.character?.name!]} />
            </div>
            <div class="flex items-center justify-between">
              <A href={`/character/${chats.character?._id}/chats`}>
                <div class="flex cursor-pointer flex-row items-center text-sm text-white/50">
                  <ChevronLeft size={16} class="mt-0.5" /> Conversations
                </div>
              </A>
            </div>
          </div>
        </div>
      </Show>
      <DeleteMsgModal show={!!removeId()} messageId={removeId()} close={() => setRemoveId('')} />
      <ChatSettingsModal show={showConfig()} close={() => setShowConfig(false)} />
    </>
  )
}

export default ChatDetail

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
