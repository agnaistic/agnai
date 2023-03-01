import { Component } from 'solid-js'
import { CHAT_ADAPTERS } from '../../../common/adapters'
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

const ChatSettingsModal: Component<{ show: boolean; close: () => void }> = (props) => {
  const state = chatStore((s) => ({ active: s.active?.chat, char: s.active?.char }))
  let ref: any

  const onSave = (ev: Event) => {
    const body = getStrictForm(ev, {
      name: 'string',
      adapter: CHAT_ADAPTERS,
      greeting: 'string',
      sampleChat: 'string',
      scenario: 'string',
      schema: ['wpp', 'boostyle', 'sbf'],
    } as const)

    const attributes = getAttributeMap(ev)

    const overrides: AppSchema.CharacterPersona = {
      kind: body.schema,
      attributes,
    }

    chatStore.editChat(state.active?._id!, { ...body, overrides }, () => {
      props.close()
    })
  }

  return (
    <Modal show={props.show} title="Chat Settings" close={props.close}>
      <form ref={ref} onSubmit={onSave}>
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
            // { label: 'Text Generation WebUI', value: 'ooba' },
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
          label="Persona"
          items={options}
          value={state.active?.overrides.kind || state.char?.persona.kind}
        />
        <div class="mt-4 flex flex-col gap-2 text-sm">
          <PersonaAttributes value={state.active?.overrides.attributes} hideLabel />
        </div>

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
