import { Component } from 'solid-js'
import { CHAT_ADAPTERS } from '../../../common/adapters'
import { AppSchema } from '../../../srv/db/schema'
import Button from '../../shared/Button'
import Dropdown from '../../shared/Dropdown'
import Modal, { ModalFooter } from '../../shared/Modal'
import PersonaAttributes, { getAttributeMap } from '../../shared/PersonaAttributes'
import TextInput from '../../shared/TextInput'
import { getFormEntries, getStrictForm } from '../../shared/util'
import { chatStore } from '../../store'

const options = [
  { value: 'wpp', label: 'W++' },
  { value: 'boostyle', label: 'Boostyle' },
  { value: 'sbf', label: 'SBF' },
]

const ChatSettingsModal: Component<{ show: boolean; close: () => void }> = (props) => {
  const state = chatStore()
  let ref: any

  const onSave = () => {
    const body = getStrictForm(ref, {
      name: 'string',
      adapter: CHAT_ADAPTERS,
      greeting: 'string',
      sampleChat: 'string',
      scenario: 'string',
      schema: ['wpp', 'boostyle', 'sbf'],
    } as const)

    const attributes = getAttributeMap(getFormEntries(ref))

    const overrides: AppSchema.CharacterPersona = {
      kind: body.schema,
      attributes,
    }

    chatStore.editChat(state.active?._id!, { ...body, overrides }, () => {
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

        <Dropdown
          fieldName="schema"
          label="Persona Schema Format"
          items={options}
          value={state.active?.overrides.kind}
        />
        <div class="mt-4 flex flex-col gap-2">
          <PersonaAttributes value={state.active?.overrides.attributes} hideLabel />
        </div>

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
