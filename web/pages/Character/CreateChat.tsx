import { useNavigate } from '@solidjs/router'
import { Check, X } from 'lucide-solid'
import { Component, createEffect, createMemo, createSignal, For, Show } from 'solid-js'
import Button from '../../shared/Button'
import Select from '../../shared/Select'
import Modal from '../../shared/Modal'
import PersonaAttributes, { getAttributeMap } from '../../shared/PersonaAttributes'
import TextInput from '../../shared/TextInput'
import { getStrictForm } from '../../shared/util'
import { characterStore, chatStore, presetStore, userStore } from '../../store'
import CharacterSelect from '../../shared/CharacterSelect'
import { AutoPreset, getPresetOptions } from '../../shared/adapter'
import { defaultPresets, isDefaultPreset } from '/common/presets'
import ServiceWarning from '/web/shared/ServiceWarning'

const options = [
  { value: 'wpp', label: 'W++' },
  { value: 'boostyle', label: 'Boostyle' },
  { value: 'sbf', label: 'SBF' },
]

const CreateChatModal: Component<{
  show: boolean
  close: () => void
  charId?: string
}> = (props) => {
  let ref: any

  const nav = useNavigate()
  const state = characterStore((s) => ({
    chars: s.characters?.list || [],
    loaded: s.characters.loaded,
  }))

  const [selectedId, setSelected] = createSignal<string>()
  const [presetId, setPresetId] = createSignal('')

  const char = createMemo(() =>
    state.chars.find((ch) => ch._id === selectedId() || ch._id === props.charId)
  )

  createEffect(() => {
    if (props.charId) return
    const curr = selectedId()
    if (curr) return

    if (!state.chars.length) return
    setSelected(state.chars[0]._id)
  })

  const user = userStore((s) => ({ ...s.user }))
  const presets = presetStore((s) => s.presets)

  const presetOptions = createMemo(() => {
    const opts = getPresetOptions(presets, { builtin: true }).filter((pre) => pre.value !== 'chat')
    return [{ label: 'System Built-in Preset (Horde)', value: AutoPreset.service }].concat(opts)
  })

  const selectedPreset = createMemo(() => {
    const id = presetId()
    console.log('pre', id)
    if (!id) return defaultPresets.horde
    if (isDefaultPreset(id)) return defaultPresets[id]
    return presets.find((pre) => pre._id === id)
  })

  const onCreate = () => {
    const character = char()
    if (!character) return

    const body = getStrictForm(ref, {
      genPreset: 'string',
      name: 'string',
      greeting: 'string',
      scenario: 'string',
      sampleChat: 'string',
      schema: ['wpp', 'boostyle', 'sbf', 'text'],
      mode: ['standard', 'adventure', null],
    } as const)

    const attributes = getAttributeMap(ref)

    const characterId = character._id

    const payload = { ...body, overrides: { kind: body.schema, attributes } }
    chatStore.createChat(characterId, payload, (id) => nav(`/chat/${id}`))
  }

  return (
    <Modal
      show={props.show}
      close={props.close}
      title={`Create Chat with ${char()?.name}`}
      maxWidth="half"
      footer={
        <>
          <Button schema="secondary" onClick={props.close}>
            <X />
            Close
          </Button>

          <Button onClick={onCreate} disabled={!char()}>
            <Check />
            Create
          </Button>
        </>
      }
    >
      <form ref={ref}>
        <div class="mb-2 text-sm">
          Optionally modify some of the conversation context. You can override other aspects of the
          character's persona from the conversation after it is created.
        </div>
        <div class="mb-4 text-sm">
          The information provided here is only applied to the newly created conversation.
        </div>
        <Show when={!props.charId}>
          <CharacterSelect
            class="w-48"
            items={state.chars}
            value={char()}
            fieldName="character"
            label="Character"
            helperText="The conversation's central character"
            onChange={(c) => setSelected(c?._id)}
          />
        </Show>

        <Select
          fieldName="genPreset"
          label="Preset"
          items={presetOptions()}
          value={user.defaultPreset || ''}
          helperText={
            <>
              <ServiceWarning service={selectedPreset()?.service} />
            </>
          }
          onChange={(ev) => setPresetId(ev.value)}
        />

        <Show when={selectedPreset()?.service === 'openai'}>
          <Select
            fieldName="mode"
            label="Chat Mode"
            helperText="EXPERIMENTAL: This is only supported on OpenAI Turbo at the moment. This feature may not work "
            items={[
              { label: 'Conversation', value: 'standard' },
              { label: 'Adventure (Experimental)', value: 'adventure' },
            ]}
            value={'standard'}
          />
        </Show>

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
          value={char()?.greeting}
          class="text-xs"
        ></TextInput>

        <TextInput
          isMultiline
          fieldName="scenario"
          label="Scenario"
          value={char()?.scenario}
          class="text-xs"
        ></TextInput>

        <TextInput
          isMultiline
          fieldName="sampleChat"
          label="Sample Chat"
          value={char()?.sampleChat}
          class="text-xs"
        ></TextInput>

        <Show when={char()?.persona.kind !== 'text'}>
          <Select
            class="mb-2 text-sm"
            fieldName="schema"
            label="Persona"
            items={options}
            value={char()?.persona.kind || 'wpp'}
          />
        </Show>

        <Show when={char()?.persona.kind === 'text'}>
          <Select
            class="mb-2 text-sm"
            fieldName="schema"
            label="Persona"
            items={[{ label: 'Plain text', value: 'text' }]}
            value={'text'}
          />
        </Show>

        <div class="w-full text-sm">
          <Show when={char()}>
            <PersonaAttributes
              value={char()!.persona.attributes}
              hideLabel
              plainText={char()?.persona?.kind === 'text'}
            />
          </Show>
          <Show when={!char()}>
            <For each={state.chars}>
              {(item) => (
                <Show when={char()?._id === item._id}>
                  <PersonaAttributes
                    value={item.persona.attributes}
                    hideLabel
                    plainText={item.persona.kind === 'text'}
                  />
                </Show>
              )}
            </For>
          </Show>
        </div>
      </form>
    </Modal>
  )
}

export default CreateChatModal
