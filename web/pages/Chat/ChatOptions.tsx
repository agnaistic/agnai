import { Book, Download, MailPlus, Palette, Settings, Sliders, Users } from 'lucide-solid'
import { Component, Show } from 'solid-js'
import Button from '../../shared/Button'
import { Toggle } from '../../shared/Toggle'
import { chatStore, userStore } from '../../store'

export type ChatModal = 'export' | 'settings' | 'invite' | 'memory' | 'gen' | 'ui' | 'members'

const ChatOptions: Component<{
  show: (modal: ChatModal) => void
  editing: boolean
  toggleEditing: () => void
}> = (props) => {
  const chats = chatStore((s) => ({ ...s.active, lastId: s.lastChatId }))
  const user = userStore()

  return (
    <div class="flex w-60 flex-col gap-2 p-2">
      <Show when={chats.chat?.userId === user.user?._id}>
        <Option onClick={props.toggleEditing}>
          <div class="flex w-full items-center justify-between">
            <div>Enable Chat Editing</div>
            <Toggle
              class="flex items-center"
              fieldName="editChat"
              value={props.editing}
              onChange={props.toggleEditing}
            />
          </div>
        </Option>

        <Option
          onClick={() => props.show('invite')}
          class="flex justify-start gap-2 hover:bg-[var(--bg-700)]"
        >
          <MailPlus /> Invite User
        </Option>

        <Option
          onClick={() => props.show('memory')}
          class="flex justify-start gap-2 hover:bg-[var(--bg-700)]"
        >
          <Book />
          Edit Chat Memory
        </Option>

        <Option
          onClick={() => props.show('members')}
          class="flex justify-start gap-2 hover:bg-[var(--bg-700)]"
        >
          <Users /> Particpants
        </Option>

        <Option
          onClick={() => props.show('gen')}
          class="flex justify-start gap-2 hover:bg-[var(--bg-700)]"
        >
          <Sliders /> Generation Settings
        </Option>

        <Option
          onClick={() => props.show('settings')}
          class="flex justify-start gap-2 hover:bg-[var(--bg-700)]"
        >
          <Settings /> Chat Settings
        </Option>
      </Show>

      <Option
        onClick={() => props.show('ui')}
        class="flex justify-start gap-2 hover:bg-[var(--bg-700)]"
      >
        <Palette /> UI Settings
      </Option>

      <Option
        onClick={() => props.show('export')}
        class="flex justify-start gap-2 hover:bg-[var(--bg-700)]"
      >
        <Download /> Export Chat
      </Option>
    </div>
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
    <Button schema="secondary" size="sm" onClick={onClick} alignLeft>
      {props.children}
    </Button>
  )
}

export default ChatOptions
