import { useNavigate, useParams } from '@solidjs/router'
import { Check, X } from 'lucide-solid'
import { Component, createEffect, createMemo, createSignal, JSX, on, onMount, Show } from 'solid-js'
import Button from '../../shared/Button'
import Select from '../../shared/Select'
import PersonaAttributes, { fromAttrs, toAttrs } from '../../shared/PersonaAttributes'
import TextInput from '../../shared/TextInput'
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
import { ADAPTER_LABELS } from '/common/adapters'
import { Page } from '/web/Layout'
import { createStore } from 'solid-js/store'

const options = [{ value: 'attributes', label: 'Attributes' }]

type ChatState = {
  name: string
  presetId: string
  imageSource: NonNullable<AppSchema.Chat['imageSource']>
  mode: NonNullable<AppSchema.Chat['mode']>
  useOverrides: boolean
  scenarioId: string
  scenarioStates: NonNullable<AppSchema.Chat['scenarioStates']>
  greeting: string
  scenario: string
  sampleChat: string
  systemPrompt: string
  postHistoryInstructions: string
  personaKind: NonNullable<AppSchema.Persona['kind']>
  personaAttrs: Array<{ key: string; values: string }>
}

const CreateChatForm: Component<{
  footer?: (footer: JSX.Element) => void
  close?: () => void
  charId?: string
}> = (props) => {
  let ref: any
  const params = useParams()
  const nav = useNavigate()

  const scen = scenarioStore((s) => s.scenarios)
  const cfg = settingStore()
  const user = userStore((s) => ({ ...s.user, sub: s.sub, userLevel: s.userLevel }))
  const chars = characterStore((s) => ({
    char: s.editing,
    chars: (s.characters?.list || []).filter((c) => !isLoggedIn() || c.userId === user._id),
    loaded: s.characters.loaded,
  }))

  const [state, setState] = createStore(getInitState(chars.char))
  const [selectedId, setSelected] = createSignal<string | undefined>(params.id)

  const scenarios = createMemo(() => {
    if (!scen.length) return [{ value: '', label: 'You have no scenarios' }]
    return [{ value: '', label: 'None' }, ...scen.map((s) => ({ label: s.name, value: s._id }))]
  })

  createEffect(() => {
    if (props.charId) return
    const curr = selectedId()
    if (curr) return

    if (!chars.chars.length) return
    setSelected(chars.chars[0]._id)
  })

  createEffect(() => {
    const id = selectedId()
    if (!id) return

    if (chars.char?._id === id) return
    characterStore.getCharacter(id)
  })

  createEffect(
    on(
      () => chars.char?._id,
      (id) => {
        if (!id) return
        const next = getInitState(chars.char, state)
        setState(next)
      }
    )
  )

  const presets = presetStore((s) => s.presets)
  const presetOptions = createMemo(() => {
    const opts = getPresetOptions(presets, { builtin: true }).filter((pre) => pre.value !== 'chat')
    const combined = [
      { label: 'System Built-in Preset (Horde)', value: AutoPreset.service, custom: false },
    ].concat(opts)

    const defaultPreset = presets.find((p) => p._id === user.defaultPreset)
    if (defaultPreset) {
      const label = ADAPTER_LABELS[defaultPreset.service!]
      combined.unshift({
        label: `[${label}] Your Default Preset`,
        value: '',
        custom: true,
      })
    }

    return combined
  })

  const selectedPreset = createMemo(() => {
    const id = state.presetId || user.defaultPreset

    if (!id) {
      const userLevel = user.userLevel
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
    if (!chars.char) return

    const characterId = chars.char._id

    const overrides = state.useOverrides
      ? {
          greeting: state.greeting,
          scenario: state.scenario,
          sampleChat: state.sampleChat,
          genPreset: state.presetId,
          overrides: { kind: state.personaKind, attributes: fromAttrs(state.personaAttrs) },
        }
      : {
          greeting: undefined,
          scenario: undefined,
          sampleChat: undefined,
          overrides: undefined,
        }

    const payload = {
      name: state.name,
      schema: state.personaKind,
      mode: state.mode,
      ...overrides,
      useOverrides: state.useOverrides,
      genPreset: state.presetId,
      scenarioId: state.scenarioId,
    }
    chatStore.createChat(characterId, payload, (id) => nav(`/chat/${id}`))
  }

  const footer = (
    <>
      <Button schema="secondary" onClick={props.close}>
        <X />
        Close
      </Button>

      <Button onClick={onCreate} disabled={!chars.char}>
        <Check />
        Create
      </Button>
    </>
  )

  onMount(() => {
    props.footer?.(footer)
  })

  return (
    <Page>
      <PageHeader title={`Create Chat with ${chars.char?.name}`} />
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
                items={chars.chars}
                value={chars.char}
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
              selected={state.presetId}
              setPresetId={(id) => setState('presetId', id)}
              warning={<ServiceWarning preset={selectedPreset()} />}
            />
          </Card>

          <Card>
            <Select
              label="Chat Mode"
              helperText={
                <div class="flex flex-col gap-2">
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
              onChange={(ev) => setState('mode', ev.value as any)}
            />
          </Card>

          <Card>
            <TextInput
              class="text-sm"
              label="Conversation Name"
              helperText={
                <span>
                  A name for the conversation. This is purely for labelling. <i>(Optional)</i>
                </span>
              }
              placeholder="Untitled"
              onChange={(ev) => setState('name', ev.currentTarget.value)}
            />
          </Card>
          <Card>
            <Toggle
              label="Override Character Definitions"
              helperText="Overrides will only apply to the newly created conversation."
              value={state.useOverrides}
              onChange={(ev) => setState('useOverrides', ev)}
            />
          </Card>

          <Divider />

          <Select
            label="Scenario"
            helperText="The scenario to use for this conversation"
            items={scenarios()}
            onChange={(ev) => setState('scenarioId', ev.value)}
            disabled={scen.length === 0}
          />

          <Card>
            <TextInput
              isMultiline
              label="Greeting"
              class="text-xs"
              disabled={!state.useOverrides}
              value={state.greeting}
              onChange={(ev) => setState('greeting', ev.currentTarget.value)}
            />
          </Card>
          <Card>
            <TextInput
              isMultiline
              label="Scenario"
              value={state.scenario}
              class="text-xs"
              disabled={!state.useOverrides}
              onChange={(ev) => setState('scenario', ev.currentTarget.value)}
            ></TextInput>
          </Card>

          <Card>
            <TextInput
              isMultiline
              label="Sample Chat"
              value={state.sampleChat}
              class="text-xs"
              disabled={!state.useOverrides}
              onChange={(ev) => setState('sampleChat', ev.currentTarget.value)}
            ></TextInput>
          </Card>

          <Card>
            <Show when={state.personaKind !== 'text'}>
              <Select
                class="mb-2 text-sm"
                label="Persona"
                items={options}
                value={state.personaKind || 'attributes'}
                disabled={!state.useOverrides}
                onChange={(ev) => setState('personaKind', ev.value as any)}
              />
            </Show>

            <Show when={state.personaKind === 'text'}>
              <Select
                class="mb-2 text-sm"
                label="Persona"
                items={[{ label: 'Plain text', value: 'text' }]}
                value={'text'}
                disabled={!state.useOverrides}
              />
            </Show>

            <div class="w-full text-sm">
              <Show when={chars.char}>
                <PersonaAttributes
                  state={state.personaAttrs}
                  setter={(next) => setState('personaAttrs', next)}
                  hideLabel
                  schema={state.personaKind}
                  disabled={!state.useOverrides}
                />
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
    </Page>
  )
}

function getInitState(char?: AppSchema.Character, previous?: ChatState): ChatState {
  return {
    name: previous?.name || '',
    presetId: previous?.presetId || '',
    imageSource: previous?.imageSource || 'settings',
    mode: previous?.mode || 'standard',

    useOverrides: previous?.useOverrides ?? false,
    scenarioId: previous?.scenarioId || '',
    scenarioStates: previous?.scenarioStates || [],

    greeting: char?.greeting || '',
    scenario: char?.scenario || '',
    sampleChat: char?.sampleChat || '',
    systemPrompt: '',
    postHistoryInstructions: '',

    personaKind: char?.persona.kind || 'text',
    personaAttrs: toAttrs(char?.persona.attributes),
  }
}

export default CreateChatForm
