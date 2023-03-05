import { Component } from 'solid-js'
import { CHAT_ADAPTERS } from '../../../common/adapters'
import { AppSchema } from '../../../srv/db/schema'
import Button from '../../shared/Button'
import Dropdown from '../../shared/Dropdown'
import Modal from '../../shared/Modal'
import PersonaAttributes, { getAttributeMap } from '../../shared/PersonaAttributes'
import TextInput from '../../shared/TextInput'
import { adaptersToOptions, getStrictForm } from '../../shared/util'
import { chatStore, settingStore } from '../../store'

const options = [
  { value: 'wpp', label: 'W++' },
  { value: 'boostyle', label: 'Boostyle' },
  { value: 'sbf', label: 'SBF' },
]

const ChatSettingsModal: Component<{ show: boolean; close: () => void }> = (props) => {
  const state = chatStore((s) => ({ active: s.active?.chat, char: s.active?.char }))
  const cfg = settingStore()

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

    const attributes = getAttributeMap(ref)

    const overrides: AppSchema.CharacterPersona = {
      kind: body.schema,
      attributes,
    }

    chatStore.editChat(state.active?._id!, { ...body, overrides }, () => {
      props.close()
    })
  }

  const Footer = (
    <>
      {' '}
      <Button schema="secondary" onClick={props.close}>
        Cancel
      </Button>
      <Button onClick={onSave}>Save</Button>
    </>
  )

  return (
    <Modal show={props.show} title="Chat Settings" close={props.close} footer={Footer}>
      <form ref={ref} onSubmit={onSave}>
        <Dropdown
          class="mb-2"
          fieldName="adapter"
          label="AI Service"
          value={state.active?.adapter}
          items={[
            { label: 'Default', value: 'default' },
            ...adaptersToOptions(cfg.config.adapters),
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
      </form>
    </Modal>
  )
}

export default ChatSettingsModal
