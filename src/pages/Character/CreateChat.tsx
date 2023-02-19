import { Check, X } from 'lucide-solid'
import { Component, Show } from 'solid-js'
import Button from '../../shared/Button'
import Modal from '../../shared/Modal'
import TextInput from '../../shared/TextInput'
import { chatStore } from '../../store'

const CreateChatModal: Component<{ show: boolean; onClose: () => void }> = (props) => {
  const state = chatStore()

  const Footer = (
    <>
      <Button schema="secondary" onClick={props.onClose}>
        <X />
        Close
      </Button>

      <Button>
        <Check />
        Create
      </Button>
    </>
  )

  return (
    <Modal
      show={props.show}
      title={`Create Conversation with ${state.chats?.character.name}`}
      footer={Footer}
    >
      <TextInput
        isMultiline
        fieldName="greeting"
        label="Greeting"
        value={state.chats?.character.greeting}
        class="text-xs"
      ></TextInput>

      <TextInput
        isMultiline
        fieldName="scenario"
        label="Scenario"
        value={state.chats?.character.scenario}
        class="text-xs"
      ></TextInput>

      <TextInput
        isMultiline
        fieldName="sampleChat"
        label="Sample Chat"
        value={state.chats?.character.sampleChat}
        class="text-xs"
      ></TextInput>
    </Modal>
  )
}

export default CreateChatModal
