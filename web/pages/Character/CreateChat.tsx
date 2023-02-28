import { useNavigate } from '@solidjs/router'
import { Check, X } from 'lucide-solid'
import { Component } from 'solid-js'
import { AppSchema } from '../../../srv/db/schema'
import Button from '../../shared/Button'
import Dropdown from '../../shared/Dropdown'
import Modal, { ModalFooter } from '../../shared/Modal'
import PersonaAttributes, { getAttributeMap } from '../../shared/PersonaAttributes'
import TextInput from '../../shared/TextInput'
import { getStrictForm } from '../../shared/util'
import { chatStore } from '../../store'

const options = [
  { value: 'wpp', label: 'W++' },
  { value: 'boostyle', label: 'Boostyle' },
  { value: 'sbf', label: 'SBF' },
]

const CreateChatModal: Component<{
  show: boolean
  onClose: () => void
  char?: AppSchema.Character
}> = (props) => {
  let ref: any
  const state = chatStore()
  const nav = useNavigate()

  const onCreate = (ev: Event) => {
    if (!state.character) return
    const body = getStrictForm(ref, {
      name: 'string',
      greeting: 'string',
      scenario: 'string',
      sampleChat: 'string',
      schema: ['wpp', 'boostyle', 'sbf'],
    } as const)

    const attributes = getAttributeMap(ref)

    const characterId = state.character._id
    chatStore.createChat(
      characterId,
      { ...body, overrides: { kind: body.schema, attributes } },
      (id) => nav(`/chat/${id}`)
    )
  }

  return (
    <Modal show={props.show} title={`Create Conversation with ${state.character?.name}`}>
      <form ref={ref}>
        <div class="mb-2 text-sm">
          Optionally modify some of the conversation context. You can override other aspects of the
          character's persona from the conversation after it is created.
        </div>
        <div class="mb-4 text-sm">
          The information provided here is only applied to the newly created conversation.
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

        <Dropdown
          class="mb-2 text-sm"
          fieldName="schema"
          label="Persona"
          items={options}
          value={state.active?.overrides.kind}
        />

        <div class="w-full text-sm">
          <PersonaAttributes value={state.character?.persona.attributes} hideLabel />
        </div>

        <ModalFooter>
          <Button schema="secondary" onClick={props.onClose}>
            <X />
            Close
          </Button>

          <Button onClick={onCreate}>
            <Check />
            Create
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

export default CreateChatModal
