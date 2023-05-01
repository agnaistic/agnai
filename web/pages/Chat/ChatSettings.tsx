import { Component, Show, createMemo, createSignal } from 'solid-js'
import { ADAPTER_LABELS, CHAT_ADAPTERS } from '../../../common/adapters'
import { AppSchema } from '../../../srv/db/schema'
import Button from '../../shared/Button'
import Select from '../../shared/Select'
import Modal from '../../shared/Modal'
import PersonaAttributes, { getAttributeMap } from '../../shared/PersonaAttributes'
import TextInput from '../../shared/TextInput'
import { adaptersToOptions, getStrictForm } from '../../shared/util'
import { chatStore, presetStore, settingStore, userStore } from '../../store'
import { getChatPreset } from '../../../common/prompt'
import { FormLabel } from '../../shared/FormLabel'
import { getInitialPresetValue, getPresetOptions } from '../../shared/adapter'

const options = [
  { value: 'wpp', label: 'W++' },
  { value: 'boostyle', label: 'Boostyle' },
  { value: 'sbf', label: 'SBF' },
]

const ChatSettingsModal: Component<{ show: boolean; close: () => void }> = (props) => {
  const state = chatStore((s) => ({ chat: s.active?.chat, char: s.active?.char }))
  const user = userStore()
  const cfg = settingStore()
  const presets = presetStore((s) => s.presets)

  let ref: any

  const onSave = () => {
    const body = getStrictForm(ref, {
      name: 'string',
      greeting: 'string',
      sampleChat: 'string',
      scenario: 'string',
      schema: ['wpp', 'boostyle', 'sbf', 'text'],
    } as const)

    const attributes = getAttributeMap(ref)

    const overrides: AppSchema.Persona = {
      kind: body.schema,
      attributes,
    }

    chatStore.editChat(state.chat?._id!, { ...body, overrides }, () => {
      props.close()
    })
  }

  const revert = () => {
    const char = state.char
    if (!char) return

    chatStore.editChat(state.chat?._id!, {
      greeting: char.greeting,
      scenario: char.scenario,
      sampleChat: char.sampleChat,
      overrides: { ...char.persona },
    })
  }

  const Footer = (
    <>
      <div class="flex w-full justify-between">
        <div>
          <Button schema="secondary" onClick={revert}>
            Reset to Character
          </Button>
        </div>
        <div class="flex gap-4">
          <Button schema="secondary" onClick={props.close}>
            Cancel
          </Button>
          <Button onClick={onSave}>Save</Button>
        </div>
      </div>
    </>
  )

  const adapterText = createMemo(() => {
    if (!state.chat || !user.user) return
    const preset = getChatPreset(state.chat, user.user, presets)
    if (!preset.service) return
    const text = `Currently: ${ADAPTER_LABELS[preset.service]}. Inherited from: ${
      preset.name || 'Chat'
    }`
    return {
      text,
      service: preset.service!,
      preset,
    }
  })

  return (
    <Modal
      show={props.show}
      title="Chat Settings"
      close={props.close}
      footer={Footer}
      maxWidth="half"
    >
      <form ref={ref} onSubmit={onSave}>
        <Show when={adapterText()}>
          <FormLabel label="AI Service" helperText={adapterText()?.text} />
        </Show>

        <Show when={!adapterText()}>
          <Select
            class={`mb-2 ${adapterText() ? 'hidden' : ''}`}
            fieldName="adapter"
            helperText={`Default is set to: ${
              ADAPTER_LABELS[user.user?.defaultAdapter || 'horde']
            }`}
            label="AI Service"
            value={state.chat?.adapter}
            items={[
              { label: 'Default', value: 'default' },
              ...adaptersToOptions(cfg.config.adapters),
            ]}
          />
        </Show>

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
          <Select
            fieldName="schema"
            label="Persona"
            items={options}
            value={state.chat?.overrides.kind || state.char?.persona.kind}
          />
        </Show>
        <Show when={state.char?.persona.kind === 'text'}>
          <Select
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
