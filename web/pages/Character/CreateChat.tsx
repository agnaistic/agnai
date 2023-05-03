import { useNavigate } from '@solidjs/router'
import { Check, X } from 'lucide-solid'
import { Component, createEffect, createMemo, createSignal, For, Show } from 'solid-js'
import { AppSchema } from '../../../srv/db/schema'
import Button from '../../shared/Button'
import Select from '../../shared/Select'
import Modal from '../../shared/Modal'
import PersonaAttributes, { getAttributeMap } from '../../shared/PersonaAttributes'
import TextInput from '../../shared/TextInput'
import { getStrictForm } from '../../shared/util'
import { characterStore, chatStore, presetStore, userStore } from '../../store'
import CharacterSelect from '../../shared/CharacterSelect'
import { getPresetOptions } from '../../shared/adapter'

const options = [
  { value: 'wpp', label: 'W++' },
  { value: 'boostyle', label: 'Boostyle' },
  { value: 'sbf', label: 'SBF' },
]

const CreateChatModal: Component<{
  show: boolean
  close: () => void
  id?: string
  char?: AppSchema.Character
}> = (props) => {
  let ref: any

  const nav = useNavigate()
  const [selectedChar, setChar] = createSignal<AppSchema.Character>()
  const state = characterStore((s) => ({
    chars: s.characters?.list || [],
    loaded: s.characters.loaded,
  }))

  const user = userStore((s) => s.user || { defaultPreset: '' })
  const presets = presetStore((s) => s.presets)

  const char = createMemo(() => {
    const curr = selectedChar() || props.char
    return curr
  })

  const presetOptions = createMemo(() =>
    getPresetOptions(presets).filter((pre) => pre.value !== 'chat')
  )

  createEffect(() => {
    if (!selectedChar() && !props.char && state.chars.length) {
      if (props.id) {
        const char = state.chars.find((ch) => ch._id === props.id)
        if (char) setChar(char)
        return
      }

      setChar(state.chars[0])
    }
  })

  const selectChar = (chr: AppSchema.Character | undefined) => {
    setChar(chr)
  }

  const onCreate = () => {
    const character = selectedChar() || props.char
    if (!character) return

    const body = getStrictForm(ref, {
      genPreset: 'string',
      name: 'string',
      greeting: 'string',
      scenario: 'string',
      sampleChat: 'string',
      schema: ['wpp', 'boostyle', 'sbf', 'text'],
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
        <Show when={!props.char}>
          <CharacterSelect
            items={state.chars}
            value={char()}
            fieldName="character"
            label="Character"
            helperText="The conversation's central character"
            onChange={(c) => selectChar(c!)}
          />
        </Show>

        <Select
          fieldName="genPreset"
          label="Preset"
          items={presetOptions()}
          value={user.defaultPreset}
        />

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

        <Show when={(props.char?.persona.kind || char()?.persona.kind) !== 'text'}>
          <Select
            class="mb-2 text-sm"
            fieldName="schema"
            label="Persona"
            items={options}
            value={props.char?.persona.kind || char()?.persona.kind}
          />
        </Show>

        <Show when={(props.char?.persona.kind || char()?.persona.kind) === 'text'}>
          <Select
            class="mb-2 text-sm"
            fieldName="schema"
            label="Persona"
            items={[{ label: 'Plain text', value: 'text' }]}
            value={'text'}
          />
        </Show>

        <div class="w-full text-sm">
          <Show when={props.char}>
            <PersonaAttributes
              value={props.char!.persona.attributes}
              hideLabel
              plainText={props.char?.persona.kind === 'text'}
            />
          </Show>
          <Show when={!props.char && !!selectedChar()}>
            {/* <PersonaAttributes
              value={selectedChar()?.persona.attributes}
              hideLabel
              plainText={selectedChar()?.persona.kind === 'text'}
            /> */}
            <For each={state.chars}>
              {(item) => (
                <Show when={selectedChar()?._id === item._id}>
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
