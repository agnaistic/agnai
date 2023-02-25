import { A } from '@solidjs/router'
import { Component, Show } from 'solid-js'
import { ADAPTERS } from '../../../common/adapters'
import Button from '../../shared/Button'
import Dropdown from '../../shared/Dropdown'
import Modal, { ModalFooter } from '../../shared/Modal'
import PageHeader from '../../shared/PageHeader'
import TextInput from '../../shared/TextInput'
import { getStrictForm } from '../../shared/util'
import { chatStore } from '../../store'

const ChatSettings: Component = () => {
  const state = chatStore()

  return (
    <div>
      <PageHeader title="Chat Settings" />
      <div>
        <A href={`/chat/${state.active?._id}`}>Back to Conversation</A>
      </div>
    </div>
  )
}

const ChatSettingsModal: Component<{ show: boolean; close: () => void }> = (props) => {
  const state = chatStore()
  let ref: any

  const onSave = () => {
    const body = getStrictForm(ref, {
      name: 'string',
      adapter: ADAPTERS,
      greeting: 'string',
      sampleChat: 'string',
      scenario: 'string',
    } as const)

    chatStore.editChat(state.active?._id!, body, () => {
      props.close()
    })
  }

  return (
    <Modal show={props.show} title="Chat Settings">
      <form ref={ref}>
        <Dropdown
          class="mb-2"
          fieldName="adapter"
          label="AI Adapater"
          value={state.active?.adapter}
          items={[
            { label: 'Default', value: 'default' },
            { label: 'Kobold', value: 'kobold' },
            { label: 'Novel', value: 'novel' },
            { label: 'Chai', value: 'chai' },
          ]}
        />
        <TextInput fieldName="name" class="text-sm" value={state.active?.name} label="Chat name" />
        <TextInput
          fieldName="greeting"
          class="text-sm"
          isMultiline
          value={state.active?.greeting}
          label="Greeting"
        />
        <TextInput
          fieldName="scenario"
          class="text-sm"
          isMultiline
          value={state.active?.scenario}
          label="Scenario"
        />
        <TextInput
          fieldName="sampleChat"
          class="text-sm"
          isMultiline
          value={state.active?.sampleChat}
          label="Sample Chat"
        />
        <ModalFooter>
          <Button schema="secondary" onClick={props.close}>
            Cancel
          </Button>
          <Button onClick={onSave}>Save</Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

export default ChatSettingsModal
