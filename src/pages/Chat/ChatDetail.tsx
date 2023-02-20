import { useParams } from '@solidjs/router'
import { Component, createEffect, createSignal, For, Show } from 'solid-js'
import PageHeader from '../../shared/PageHeader'
import { chatStore } from '../../store'
import Header from './components/Header'
import InputBar from './components/InputBar'
import Message from './components/Message'
import { mockMessages } from './mocks'

const ChatDetail: Component = () => {
  const state = chatStore((s) => ({ chat: s.activeChat?.chat, character: s.activeChat?.character }))
  const { id } = useParams()

  createEffect(() => {
    if (!id && state.chat) return
    if (!state.chat || state.chat._id !== id) {
      chatStore.getChat(id)
    }
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
              <For each={mockMessages}>{(msg) => <Message msg={msg} />}</For>
            </div>
            <Header participants={['You', state.character?.name!]} />
          </div>
        </div>
      </Show>
    </>
  )
}

export default ChatDetail
