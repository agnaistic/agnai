import { Component } from 'solid-js'
import PageHeader from '../../shared/PageHeader'
import { chatStore } from '../../store'

const ChatSettings: Component = () => {
  const state = chatStore((s) => ({ chat: s.activeChat?.chat, char: s.activeChat?.character }))

  return (
    <div>
      <PageHeader title="Chat Settings" />
    </div>
  )
}
