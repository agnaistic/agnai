import { useNavigate, useParams } from '@solidjs/router'
import { Component, createEffect, createSignal, For, Show } from 'solid-js'
import { AppSchema } from '../../../srv/db/schema'
import PageHeader from '../../shared/PageHeader'
import { chatStore } from '../../store'
import Header from './components/Header'
import InputBar from './components/InputBar'
import Message from './components/Message'

const ChatDetail: Component = () => {
  const state = chatStore((s) => ({
    chat: s.activeChat?.chat,
    character: s.activeChat?.character,
    lastId: s.lastChatId,
    msgs: s.msgs,
    partial: s.partial,
  }))

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
      <Show when={!state.chat}>
        <div>
          <PageHeader title="Conversation" />
          <div>Loading...</div>
        </div>
      </Show>
      <Show when={state.chat}>
        <div class="flex h-full flex-col-reverse">
          <InputBar />
          <div class="flex flex-col-reverse overflow-y-scroll">
            <div class="flex flex-col gap-6 pt-4 pb-8">
              <For each={state.msgs}>{(msg) => <Message msg={msg} char={state.character} />}</For>
              <Show when={state.partial}>
                <Message
                  char={state.character}
                  msg={emptyMsg(state.character?._id!, state.partial!)}
                />
              </Show>
              <Show when={state.partial !== undefined}>
                <div class="flex justify-center">
                  <div class="dot-flashing bg-purple-700"></div>
                </div>
              </Show>
            </div>
            <Header participants={['You', state.character?.name!]} />
          </div>
        </div>
      </Show>
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
