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
      <div class="mb-4 text-sm">
        Optionally modify some of the conversation context. You can override other aspects of the
        character's persona from the conversation after it is created.
      </div>
      <TextInput
        class="text-sm"
        fieldName="name"
        label="Conversation Name"
        helperText={
          <span>
            A name for the conversation. This is purely for labelling. <i>(Optional)</i>
          </span>
        }
        placeholder="Optional"
      />
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
