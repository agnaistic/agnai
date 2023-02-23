import { A, useNavigate, useParams } from '@solidjs/router'
import { ChevronLeft } from 'lucide-solid'
import { Component, createEffect, createSignal, For, Show } from 'solid-js'
import { AppSchema } from '../../../srv/db/schema'
import PageHeader from '../../shared/PageHeader'
import { chatStore } from '../../store'
import Header from './components/Header'
import InputBar from './components/InputBar'
import Message from './components/Message'
import DeleteMsgModal from './DeleteMsgModal'

const ChatDetail: Component = () => {
  const state = chatStore((s) => ({
    chat: s.activeChat?.chat,
    character: s.activeChat?.character,
    lastId: s.lastChatId,
    msgs: s.msgs,
    partial: s.partial,
  }))

  const [removeId, setRemoveId] = createSignal('')
  const { id } = useParams()
  const nav = useNavigate()

  createEffect(() => {
    if (!id) {
      if (!state.lastId) {
        return nav('/character/list')
      }

      return nav(`/chat/${state.lastId}`)
    }

    chatStore.getChat(id)
  })

  return (
    <>
      <Show when={state.chat}>
        <div>
          <div>Loading conversation...</div>
        </div>
      </Show>
      <div class="flex h-6 items-center">
        <A href={`/character/${state.character?._id}/chats`}>
          <div class="flex cursor-pointer flex-row items-center text-sm text-white/50">
            <ChevronLeft size={16} class="mt-0.5" /> Conversations
          </div>
        </A>
      </div>
      <Show when={state.chat}>
        <div class="flex h-[calc(100%-24px)] flex-col-reverse">
          <InputBar />
          <div class="flex flex-col-reverse overflow-y-scroll">
            <div class="flex flex-col gap-4 pt-4 pb-4">
              <For each={state.msgs}>
                {(msg, i) => (
                  <Message
                    msg={msg}
                    char={state.character}
                    last={i() >= 2 && i() === state.msgs.length - 1}
                    onRemove={() => setRemoveId(msg._id)}
                  />
                )}
              </For>
              <Show when={state.partial}>
                <Message
                  char={state.character}
                  msg={emptyMsg(state.character?._id!, state.partial!)}
                  onRemove={() => {}}
                />
              </Show>
              <Show when={state.partial !== undefined}>
                <div class="flex justify-center">
                  <div class="dot-flashing bg-purple-700"></div>
                </div>
              </Show>
            </div>
            <Header participants={[state.character?.name!]} />
          </div>
        </div>
      </Show>
      <DeleteMsgModal show={!!removeId()} messageId={removeId()} close={() => setRemoveId('')} />
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
