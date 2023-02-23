import { A } from '@solidjs/router'
import { Component, Show } from 'solid-js'
import Button from '../../shared/Button'
import Dropdown from '../../shared/Dropdown'
import Modal, { ModalFooter } from '../../shared/Modal'
import PageHeader from '../../shared/PageHeader'
import TextInput from '../../shared/TextInput'
import { getStrictForm } from '../../shared/util'
import { chatStore } from '../../store'

const ChatSettings: Component = () => {
  const state = chatStore((s) => ({ chat: s.activeChat?.chat, char: s.activeChat?.character }))

  return (
    <div>
      <PageHeader title="Chat Settings" />
      <div>
        <A href={`/chat/${state.chat?._id}`}>Back to Conversation</A>
      </div>
    </div>
  )
}

const ChatSettingsModal: Component<{ show: boolean; close: () => void }> = (props) => {
  const state = chatStore((s) => ({ chat: s.activeChat?.chat, char: s.activeChat?.character }))
  let ref: any

  const onSave = (ev: Event) => {
    console.log(ref)
    const body = getStrictForm(ev, { name: 'string' })
    console.log(body)
  }

  return (
    <Modal show={props.show} title="Chat Settings">
      <form ref={ref} onSubmit={onSave}>
        <Dropdown
          class="mb-2"
          fieldName="adapter"
          label="AI Adapater"
          value={state.chat?.adapter}
          items={[
            { label: 'Default', value: 'default' },
            { label: 'Kobold', value: 'kobold' },
            { label: 'Novel', value: 'novel' },
          ]}
        />
        <TextInput fieldName="name" value={state.chat?.name} label="Chat name" />
        <TextInput fieldName="greeting" isMultiline value={state.chat?.greeting} label="Greeting" />
        <TextInput fieldName="scenario" isMultiline value={state.chat?.scenario} label="Scenario" />
        <TextInput
          fieldName="sampleChat"
          isMultiline
          value={state.chat?.sampleChat}
          label="Sample Chat"
        />
        <ModalFooter>
          <Button schema="secondary" onClick={props.close}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

export default ChatSettingsModal
