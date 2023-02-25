import { useNavigate } from '@solidjs/router'
import { Check, X } from 'lucide-solid'
import { Component } from 'solid-js'
import { AppSchema } from '../../../srv/db/schema'
import Button from '../../shared/Button'
import Modal, { ModalFooter } from '../../shared/Modal'
import TextInput from '../../shared/TextInput'
import { getStrictForm } from '../../shared/util'
import { chatStore } from '../../store'

const CreateChatModal: Component<{
  show: boolean
  onClose: () => void
  char?: AppSchema.Character
}> = (props) => {
  const state = chatStore()
  const nav = useNavigate()

  const onCreate = (ev: Event) => {
    if (!state.character) return
    const body = getStrictForm(ev, {
      name: 'string',
      greeting: 'string',
      scenario: 'string',
      sampleChat: 'string',
    })

    const characterId = state.character._id
    chatStore.createChat(characterId, body, (id) => nav(`/chat/${id}`))
  }

  return (
    <Modal show={props.show} title={`Create Conversation with ${state.character?.name}`}>
      <form onSubmit={onCreate}>
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
          placeholder="Untitled"
        />
        <TextInput
          isMultiline
          fieldName="greeting"
          label="Greeting"
          value={state.character?.greeting}
          class="text-xs"
        ></TextInput>

        <TextInput
          isMultiline
          fieldName="scenario"
          label="Scenario"
          value={state.character?.scenario}
          class="text-xs"
        ></TextInput>

        <TextInput
          isMultiline
          fieldName="sampleChat"
          label="Sample Chat"
          value={state.character?.sampleChat}
          class="text-xs"
        ></TextInput>

        <ModalFooter>
          <Button schema="secondary" onClick={props.onClose}>
            <X />
            Close
          </Button>

          <Button type="submit">
            <Check />
            Create
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

export default CreateChatModal
