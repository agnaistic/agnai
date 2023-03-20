import { Component, Show } from 'solid-js'
import { ADAPTER_LABELS, CHAT_ADAPTERS } from '../../../common/adapters'
import { AppSchema } from '../../../srv/db/schema'
import Button from '../../shared/Button'
import Dropdown from '../../shared/Dropdown'
import Modal from '../../shared/Modal'
import PersonaAttributes, { getAttributeMap } from '../../shared/PersonaAttributes'
import TextInput from '../../shared/TextInput'
import { adaptersToOptions, getStrictForm } from '../../shared/util'
import { chatStore, settingStore, userStore } from '../../store'

const options = [
  { value: 'wpp', label: 'W++' },
  { value: 'boostyle', label: 'Boostyle' },
  { value: 'sbf', label: 'SBF' },
]

const ChatSettingsModal: Component<{ show: boolean; close: () => void }> = (props) => {
  const state = chatStore((s) => ({ chat: s.active?.chat, char: s.active?.char }))
  const user = userStore()
  const cfg = settingStore()

  let ref: any

  const onSave = () => {
    const body = getStrictForm(ref, {
      name: 'string',
      adapter: CHAT_ADAPTERS,
      greeting: 'string',
      sampleChat: 'string',
      scenario: 'string',
      schema: ['wpp', 'boostyle', 'sbf', 'text'],
    } as const)

    const attributes = getAttributeMap(ref)

    const overrides: AppSchema.CharacterPersona = {
      kind: body.schema,
      attributes,
    }

    chatStore.editChat(state.chat?._id!, { ...body, overrides }, () => {
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
    <Modal
      show={props.show}
      title="Chat Settings"
      close={props.close}
      footer={Footer}
      maxWidth="half"
    >
      <form ref={ref} onSubmit={onSave}>
        <Dropdown
          class="mb-2"
          fieldName="adapter"
          helperText={`Default is set to: ${ADAPTER_LABELS[user.user?.defaultAdapter || 'horde']}`}
          label="AI Service"
          value={state.chat?.adapter}
          items={[
            { label: 'Default', value: 'default' },
            ...adaptersToOptions(cfg.config.adapters),
          ]}
        />
        <TextInput fieldName="name" class="text-sm" value={state.chat?.name} label="Chat name" />
        <TextInput
          fieldName="greeting"
          class="text-sm"
          isMultiline
          value={state.chat?.greeting}
          label="Greeting"
        />
        <TextInput
          fieldName="scenario"
          class="text-sm"
          isMultiline
          value={state.chat?.scenario}
          label="Scenario"
        />
        <TextInput
          fieldName="sampleChat"
          class="text-sm"
          isMultiline
          value={state.chat?.sampleChat}
          label="Sample Chat"
        />

        <Show when={state.char?.persona.kind !== 'text'}>
          <Dropdown
            fieldName="schema"
            label="Persona"
            items={options}
            value={state.chat?.overrides.kind || state.char?.persona.kind}
          />
        </Show>
        <Show when={state.char?.persona.kind === 'text'}>
          <Dropdown
            fieldName="schema"
            label="Persona"
            items={[{ label: 'Plain text', value: 'text' }]}
            value={'text'}
          />
        </Show>
        <div class="mt-4 flex flex-col gap-2 text-sm">
          <PersonaAttributes
            value={state.chat?.overrides.attributes || state.char?.persona.attributes}
            hideLabel
            plainText={state.char?.persona.kind === 'text'}
          />
        </div>
      </form>
    </Modal>
  )
}

export default ChatSettingsModal
