import { Component, Show, createEffect, createMemo, createSignal, onMount } from 'solid-js'
import { ADAPTER_LABELS } from '../../../common/adapters'
import { AppSchema } from '../../../common/types/schema'
import Button from '../../shared/Button'
import Select from '../../shared/Select'
import PersonaAttributes, { getAttributeMap } from '../../shared/PersonaAttributes'
import TextInput from '../../shared/TextInput'
import { adaptersToOptions, getStrictForm } from '../../shared/util'
import { chatStore, presetStore, scenarioStore, settingStore, userStore } from '../../store'
import { getChatPreset } from '../../../common/prompt'
import { FormLabel } from '../../shared/FormLabel'
import { defaultPresets, isDefaultPreset } from '/common/presets'
import { Card, TitleCard } from '/web/shared/Card'
import { Toggle } from '/web/shared/Toggle'
import TagInput from '/web/shared/TagInput'
import { usePane } from '/web/shared/hooks'

const formatOptions = [
  { value: 'attributes', label: 'Attributes' },
  { value: 'text', label: 'Plain text' },
]

const backupFormats: any = {
  sbf: { value: 'sbf', label: 'SBF' },
  wpp: { value: 'wpp', label: 'W++' },
  boostyle: { value: 'boostyle', label: 'Boostyle' },
}

const ChatSettings: Component<{
  close: () => void
  footer: (children: any) => void
}> = (props) => {
  const state = chatStore((s) => ({ chat: s.active?.chat, char: s.active?.char }))
  const user = userStore()
  const cfg = settingStore()
  const presets = presetStore((s) => s.presets)
  const [useOverrides, setUseOverrides] = createSignal(!!state.chat?.overrides)
  const [kind, setKind] = createSignal(state.chat?.overrides?.kind || state.char?.persona.kind)
  const scenarioState = scenarioStore()
  const pane = usePane()

  const personaFormats = createMemo(() => {
    const format = kind()

    if (!format || format in formatOptions === false) return formatOptions

    return formatOptions.concat(backupFormats[format])
  })

  const activePreset = createMemo(() => {
    const presetId = state.chat?.genPreset
    if (!presetId) return

    if (isDefaultPreset(presetId)) return defaultPresets[presetId]
    return presets.find((pre) => pre._id === presetId)
  })

  let ref: any

  const [mode, setMode] = createSignal(state.chat?.mode || 'standard')
  const [scenarioId, setScenarioId] = createSignal(state.chat?.scenarioIds?.[0] || '')
  const [scenarioText, setScenarioText] = createSignal(state.chat?.scenario || state.char?.scenario)
  const [states, setStates] = createSignal(state.chat?.scenarioStates || [])

  onMount(() => {
    scenarioStore.getAll()
  })

  createEffect(() => {
    setScenarioId(state.chat?.scenarioIds?.[0] || '')
  })

  createEffect(() => {
    const currentText = scenarioText()
    const scenario = scenarioState.scenarios.find((s) => s._id === scenarioId())
    if (scenario?.overwriteCharacterScenario && !state.chat?.scenarioIds?.includes(scenario._id)) {
      setScenarioText(scenario.text)
    } else {
      setScenarioText(currentText)
    }
  })

  const scenarios = createMemo(() => {
    const noScenario = [{ value: '', label: "None (use character's scenario)" }]
    if (scenarioState.loading || scenarioState.partial) {
      return noScenario.concat(
        (state.chat?.scenarioIds ?? []).map((id) => ({
          value: id,
          label: '...',
        }))
      )
    } else {
      return noScenario.concat(
        scenarioState.scenarios.map((s) => ({ label: s.name || 'Untitled scenario', value: s._id }))
      )
    }
  })

  const onSave = () => {
    const { scenarioId, ...body } = getStrictForm(ref, {
      name: 'string',
      greeting: 'string?',
      sampleChat: 'string?',
      systemPrompt: 'string?',
      postHistoryInstructions: 'string?',
      scenario: 'string?',
      schema: ['wpp', 'boostyle', 'sbf', 'text', 'attributes', null],
      scenarioId: 'string?',
      mode: ['standard', 'adventure', 'companion', null],
    })

    const attributes = getAttributeMap(ref)

    const overrides: AppSchema.Persona | undefined = body.schema
      ? { kind: body.schema, attributes }
      : undefined

    const payload = {
      ...body,
      overrides,
      scenarioIds: scenarioId ? [scenarioId] : [],
      scenarioStates: states(),
    }
    chatStore.editChat(state.chat?._id!, payload, useOverrides(), () => {
      if (pane() !== 'pane') {
        props.close()
      }
    })
  }

  const revert = () => {
    const char = state.char
    if (!char) return

    chatStore.editChat(state.chat?._id!, {}, false)
  }

  const Footer = (
    <>
      <div class="flex w-full justify-between gap-2">
        <div>
          <Button schema="secondary" onClick={revert}>
            Reset Character
          </Button>
        </div>
        <div class="flex gap-2">
          <Button schema="secondary" onClick={props.close}>
            Cancel
          </Button>
          <Button onClick={onSave}>Save</Button>
        </div>
      </div>
    </>
  )

  props.footer(Footer)

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
    <form ref={ref} onSubmit={onSave} class="flex flex-col gap-3">
      <Show when={user.user?.admin}>
        <Card class="text-xs">{state.chat?._id}</Card>
      </Show>
      <Show when={adapterText()}>
        <Card>
          <FormLabel label="AI Service" helperText={adapterText()?.text} />
        </Card>
      </Show>

      <Show when={!adapterText()}>
        <Card>
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
        </Card>
      </Show>

      <Show when={activePreset()?.service !== 'horde'}>
        <Card>
          <Select
            fieldName="mode"
            label="Chat Mode"
            helperText={
              <>
                <p>
                  Adventure mode is only available for instruct-capable models. I.e: OpenAI Turbo
                </p>
                <Show when={state.chat?.mode !== 'companion' && mode() === 'companion'}>
                  <TitleCard type="orange">
                    Warning! Switching to COMPANION mode is irreversible! You will no longer be able
                    to: retry messages, delete chats, edit chat settings.
                  </TitleCard>
                </Show>
              </>
            }
            onChange={(ev) => setMode(ev.value as any)}
            items={[
              { label: 'Conversation', value: 'standard' },
              { label: 'Adventure (Experimental)', value: 'adventure' },
              { label: 'Companion', value: 'companion' },
            ]}
            value={state.chat?.mode || 'standard'}
          />
        </Card>
      </Show>
      <Card>
        <TextInput fieldName="name" class="text-sm" value={state.chat?.name} label="Chat name" />
      </Card>
      <Card>
        <Toggle
          fieldName="useOverrides"
          value={useOverrides()}
          onChange={(use) => setUseOverrides(use)}
          label="Override Character Definitions"
          helperText="Overrides apply to this chat only. If you want to edit the original character, open the 'Character' link in the Chat Menu instead."
        />
      </Card>

      <Show when={scenarios().length > 1}>
        <Card>
          <Select
            fieldName="scenarioId"
            label="Scenario"
            helperText="The scenario to use for this conversation"
            items={scenarios()}
            value={scenarioId()}
            onChange={(option) => setScenarioId(option.value)}
          />

          <Show when={scenarioId() !== ''}>
            <TagInput
              availableTags={[]}
              onSelect={(tags) => setStates(tags)}
              fieldName="scenarioStates"
              label="The current state of the scenario"
              helperText="What flags have been set in the chat by the scenario so far"
              value={state.chat?.scenarioStates ?? []}
            />
          </Show>
        </Card>
      </Show>

      <Show when={useOverrides()}>
        <Card>
          <TextInput
            fieldName="greeting"
            class="text-sm"
            isMultiline
            value={state.chat?.greeting || state.char?.greeting}
            label="Greeting"
          />

          <TextInput
            fieldName="scenario"
            class="text-sm"
            isMultiline
            value={scenarioText()}
            onChange={(ev) => setScenarioText(ev.currentTarget.value)}
            label="Scenario"
          />

          <TextInput
            fieldName="sampleChat"
            class="text-sm"
            isMultiline
            value={state.chat?.sampleChat || state.char?.sampleChat}
            label="Sample Chat"
          />

          <TextInput
            fieldName="systemPrompt"
            class="text-sm"
            label="Character System Prompt"
            value={state.chat?.systemPrompt}
          />

          <TextInput
            fieldName="postHistoryInstructions"
            class="text-sm"
            label="Character Post-History Instructions"
            value={state.chat?.postHistoryInstructions}
          />

          <Select
            fieldName="schema"
            label="Persona"
            items={personaFormats()}
            value={kind()}
            onChange={(ev) => setKind(ev.value as any)}
          />
          <div class="mt-4 flex flex-col gap-2 text-sm">
            <PersonaAttributes
              value={state.chat?.overrides?.attributes || state.char?.persona?.attributes}
              hideLabel
              plainText={kind() === 'text'}
            />
          </div>
        </Card>
      </Show>
    </form>
  )
}

export default ChatSettings
