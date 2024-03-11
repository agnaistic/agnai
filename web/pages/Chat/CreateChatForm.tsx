import { useNavigate, useParams } from '@solidjs/router'
import { Check, X } from 'lucide-solid'
import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  JSX,
  onMount,
  Show,
} from 'solid-js'
import Button from '../../shared/Button'
import Select from '../../shared/Select'
import PersonaAttributes, { getAttributeMap } from '../../shared/PersonaAttributes'
import TextInput from '../../shared/TextInput'
import { getStrictForm } from '../../shared/util'
import {
  characterStore,
  chatStore,
  presetStore,
  scenarioStore,
  settingStore,
  userStore,
} from '../../store'
import CharacterSelect from '../../shared/CharacterSelect'
import { AutoPreset, getPresetOptions } from '../../shared/adapter'
import { defaultPresets, isDefaultPreset } from '/common/presets'
import ServiceWarning from '/web/shared/ServiceWarning'
import { PresetSelect } from '/web/shared/PresetSelect'
import { Card, TitleCard } from '/web/shared/Card'
import { Toggle } from '/web/shared/Toggle'
import Divider from '/web/shared/Divider'
import PageHeader from '/web/shared/PageHeader'
import { isLoggedIn } from '/web/store/api'
import { AppSchema } from '/common/types'
import { isEligible } from './util'

const options = [
  { value: 'wpp', label: 'W++' },
  { value: 'boostyle', label: 'Boostyle' },
  { value: 'sbf', label: 'SBF' },
]

const CreateChatForm: Component<{
  footer?: (footer: JSX.Element) => void
  close?: () => void
  charId?: string
}> = (props) => {
  const params = useParams()
  let ref: any

  const nav = useNavigate()
  const scenarios = scenarioStore((s) => s.scenarios)
  const cfg = settingStore()
  const user = userStore((s) => ({ ...s.user, sub: s.sub }))
  const state = characterStore((s) => ({
    char: s.editing,
    chars: (s.characters?.list || []).filter((c) => !isLoggedIn() || c.userId === user._id),
    loaded: s.characters.loaded,
  }))

  const [selectedId, setSelected] = createSignal<string | undefined>(params.id)
  const [useOverrides, setUseOverrides] = createSignal(false)
  const [scenario, setScenario] = createSignal<AppSchema.ScenarioBook>()

  const currScenarios = createMemo(() => {
    if (!scenarios.length) return [{ value: '', label: 'You have no scenarios' }]
    return [
      { value: '', label: 'None' },
      ...scenarios.map((s) => ({ label: s.name, value: s._id })),
    ]
  })

  createEffect(() => {
    if (props.charId) return
    const curr = selectedId()
    if (curr) return

    if (!state.chars.length) return
    setSelected(state.chars[0]._id)
  })

  createEffect(() => {
    const id = selectedId()
    if (!id) return

    if (state.char?._id === id) return

    characterStore.getCharacter(id)
  })

  const setScenarioById = (scenarioId: string) => {
    setScenario(scenarios.find((s) => s._id === scenarioId))
  }

  const [presetId, setPresetId] = createSignal(
    user.defaultPreset || (isEligible() ? 'agnai' : 'horde')
  )
  const presets = presetStore((s) => s.presets)
  const presetOptions = createMemo(() => {
    const opts = getPresetOptions(presets, { builtin: true }).filter((pre) => pre.value !== 'chat')
    return [
      { label: 'System Built-in Preset (Horde)', value: AutoPreset.service, custom: false },
    ].concat(opts)
  })

  const selectedPreset = createMemo(() => {
    const id = presetId()

    if (!id) {
      const userLevel = user.sub?.level ?? -1
      const eligible = cfg.config.subs.some((sub) => userLevel >= sub.level)

      if (eligible) {
        return defaultPresets.agnai
      }

      return defaultPresets.horde
    }

    if (isDefaultPreset(id)) return defaultPresets[id]
    return presets.find((pre) => pre._id === id)
  })

  const onCreate = () => {
    if (!state.char) return

    const body = getStrictForm(ref, {
      name: 'string',
      greeting: 'string',
      scenario: 'string',
      sampleChat: 'string',
      schema: ['wpp', 'boostyle', 'sbf', 'text'],
      mode: ['standard', 'adventure', 'companion', null],
    } as const)

    const attributes = getAttributeMap(ref)

    const characterId = state.char._id

    const overrides = useOverrides()
      ? {
          greeting: body.greeting,
          scenario: body.scenario,
          sampleChat: body.sampleChat,
          genPreset: presetId(),
          overrides: { kind: body.schema, attributes },
        }
      : {
          greeting: undefined,
          scenario: undefined,
          sampleChat: undefined,
          overrides: undefined,
        }

    if (useOverrides()) {
      overrides.greeting = body.greeting
    }

    const payload = {
      ...body,
      ...overrides,
      useOverrides: useOverrides(),
      genPreset: presetId(),
      scenarioId: scenario()?._id,
    }
    chatStore.createChat(characterId, payload, (id) => nav(`/chat/${id}`))
  }

  const footer = (
    <>
      <Button schema="secondary" onClick={props.close}>
        <X />
        Close
      </Button>

      <Button onClick={onCreate} disabled={!state.char}>
        <Check />
        Create
      </Button>
    </>
  )

  onMount(() => {
    props.footer?.(footer)
  })

  return (
    <>
      <PageHeader title={`Create Chat with ${state.char?.name}`} />
      <form ref={ref}>
        <div class="mb-2 text-sm">
          Optionally modify some of the conversation context. You can override other aspects of the
          character's persona from the conversation after it is created.
        </div>
        <div class="mb-4 text-sm">
          The information provided here is only applied to the newly created conversation.
        </div>
        <div class="flex flex-col gap-3">
          <Show when={!props.charId}>
            <Card>
              <CharacterSelect
                class="w-48"
                items={state.chars}
                value={state.char}
                fieldName="character"
                label="Character"
                helperText="The conversation's main character"
                onChange={(c) => setSelected(c?._id)}
                ignoreActive
              />
            </Card>
          </Show>
          <Card>
            <PresetSelect
              options={presetOptions()}
              selected={presetId()}
              setPresetId={setPresetId}
              warning={<ServiceWarning preset={selectedPreset()} />}
            />
          </Card>

          <Card>
            <Select
              fieldName="mode"
              label="Chat Mode"
              helperText={
                <div class="flex flex-col gap-2">
                  <TitleCard>
                    <b>ADVENTURE:</b> Adventure mode is currently disabled and will return when
                    Sagas are out of Preview.
                  </TitleCard>
                  <TitleCard>
                    <b>COMPANION:</b> Everything is permanent. You will not be able to: Edit Chat,
                    Retry Message, Delete Messages, etc.
                  </TitleCard>
                </div>
              }
              items={[
                { label: 'Conversation', value: 'standard' },
                { label: 'Companion', value: 'companion' },
              ]}
              value={'standard'}
            />
          </Card>

          <Card>
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
          </Card>
          <Card>
            <Toggle
              fieldName="useOverrides"
              value={useOverrides()}
              onChange={(use) => setUseOverrides(use)}
              label="Override Character Definitions"
              helperText="Overrides will only apply to the newly created conversation."
            />
          </Card>

          <Divider />

          <Select
            fieldName="scenarioId"
            label="Scenario"
            helperText="The scenario to use for this conversation"
            items={currScenarios()}
            onChange={(option) => setScenarioById(option.value)}
            disabled={scenarios.length === 0}
          />

          <Card>
            <TextInput
              isMultiline
              fieldName="greeting"
              label="Greeting"
              value={state.char?.greeting}
              class="text-xs"
              disabled={!useOverrides()}
            ></TextInput>
          </Card>
          <Card>
            <TextInput
              isMultiline
              fieldName="scenario"
              label="Scenario"
              value={state.char?.scenario}
              class="text-xs"
              disabled={!useOverrides()}
            ></TextInput>
          </Card>

          <Card>
            <TextInput
              isMultiline
              fieldName="sampleChat"
              label="Sample Chat"
              value={state.char?.sampleChat}
              class="text-xs"
              disabled={!useOverrides()}
            ></TextInput>
          </Card>

          <Card>
            <Show when={state.char?.persona.kind !== 'text'}>
              <Select
                class="mb-2 text-sm"
                fieldName="schema"
                label="Persona"
                items={options}
                value={state.char?.persona.kind || 'wpp'}
                disabled={!useOverrides()}
              />
            </Show>

            <Show when={state.char?.persona.kind === 'text'}>
              <Select
                class="mb-2 text-sm"
                fieldName="schema"
                label="Persona"
                items={[{ label: 'Plain text', value: 'text' }]}
                value={'text'}
                disabled={!useOverrides()}
              />
            </Show>

            <div class="w-full text-sm">
              <Show when={state.char}>
                <PersonaAttributes
                  value={state.char?.persona.attributes}
                  hideLabel
                  plainText={state.char?.persona?.kind === 'text'}
                  schema={state.char?.persona.kind}
                  disabled={!useOverrides()}
                />
              </Show>
              <Show when={!state.char}>
                <For each={state.chars}>
                  {(item) => (
                    <Show when={state.char?._id === item._id}>
                      <PersonaAttributes
                        value={item.persona.attributes}
                        hideLabel
                        plainText={item.persona.kind === 'text'}
                        schema={state.char?.persona.kind}
                        disabled={!useOverrides()}
                      />
                    </Show>
                  )}
                </For>
              </Show>
            </div>
          </Card>
        </div>

        <Show when={!props.footer}>
          <Card class="mb-8 mt-2">
            <div class="flex w-full justify-end gap-2">{footer}</div>
          </Card>
        </Show>
      </form>
    </>
  )
}

export default CreateChatForm
