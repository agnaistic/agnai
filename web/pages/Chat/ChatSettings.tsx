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
import { useTransContext } from '@mbarzda/solid-i18next'
import { TFunction } from 'i18next'

const formatOptions = (t: TFunction) => [
  { value: 'attributes', label: t('attributes') },
  { value: 'text', label: t('plain_text') },
]

const backupFormats: any = (t: TFunction) => ({
  sbf: { value: 'sbf', label: t('sbf') },
  wpp: { value: 'wpp', label: t('w++') },
  boostyle: { value: 'boostyle', label: t('boostyle') },
})

const ChatSettings: Component<{
  close: () => void
  footer: (children: any) => void
}> = (props) => {
  const [t] = useTransContext()

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

    if (!format || !(format in formatOptions(t))) return formatOptions(t)

    return formatOptions(t).concat(backupFormats(t)[format])
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
    const noScenario = [{ value: '', label: t('none_use_characters_scenario') }]
    if (scenarioState.loading || scenarioState.partial) {
      return noScenario.concat(
        (state.chat?.scenarioIds ?? []).map((id) => ({
          value: id,
          label: '...',
        }))
      )
    } else {
      return noScenario.concat(
        scenarioState.scenarios.map((s) => ({
          label: s.name || t('untitled_scenario'),
          value: s._id,
        }))
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
            {t('reset_character')}
          </Button>
        </div>
        <div class="flex gap-2">
          <Button schema="secondary" onClick={props.close}>
            {t('cancel')}
          </Button>
          <Button onClick={onSave}>{t('save')}</Button>
        </div>
      </div>
    </>
  )

  props.footer(Footer)

  const adapterText = createMemo(() => {
    if (!state.chat || !user.user) return
    const preset = getChatPreset(state.chat, user.user, presets)
    if (!preset.service) return
    const text = t('currently_inherited_from_x', {
      name: ADAPTER_LABELS(t)[preset.service],
      preset: preset.name || t('chat'),
    })
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
            helperText={t('default_is_set_to_x', {
              name: ADAPTER_LABELS(t)[user.user?.defaultAdapter || 'horde'],
            })}
            label={t('ai_service')}
            value={state.chat?.adapter}
            items={[
              { label: t('default'), value: 'default' },
              ...adaptersToOptions(cfg.config.adapters),
            ]}
          />
        </Card>
      </Show>

      <Show when={activePreset()?.service !== 'horde'}>
        <Card>
          <Select
            fieldName="mode"
            label={t('chat_mode')}
            helperText={
              <>
                <p>{t('adventure_mode_is_only_available_for_instruct_capable_models')}</p>
                <Show when={state.chat?.mode !== 'companion' && mode() === 'companion'}>
                  <TitleCard type="orange">
                    {t('warning_switching_to_companion_mode_is_irreversible')}
                  </TitleCard>
                </Show>
              </>
            }
            onChange={(ev) => setMode(ev.value as any)}
            items={[
              { label: t('conversation'), value: 'standard' },
              { label: t('companion'), value: 'companion' }
            ]}
            value={state.chat?.mode || 'standard'}
          />
        </Card>
      </Show>
      <Card>
        <TextInput
          fieldName="name"
          class="text-sm"
          value={state.chat?.name}
          label={t('chat_name')}
        />
      </Card>
      <Card>
        <Toggle
          fieldName="useOverrides"
          value={useOverrides()}
          onChange={(use) => setUseOverrides(use)}
          label={t('override_character_definitions')}
          helperText={t('override_character_definitions_message')}
        />
      </Card>

      <Show when={scenarios().length > 1}>
        <Card>
          <Select
            fieldName="scenarioId"
            label={t('scenario')}
            helperText={t('the_scenario_to_use_for_this_conversation')}
            items={scenarios()}
            value={scenarioId()}
            onChange={(option) => setScenarioId(option.value)}
          />

          <Show when={scenarioId() !== ''}>
            <TagInput
              availableTags={[]}
              onSelect={(tags) => setStates(tags)}
              fieldName="scenarioStates"
              label={t('the_current_state_of_the_scenario')}
              helperText={t('what_flats_have_been_set_in_the_chat_by_the_scenario')}
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
            label={t('greeting')}
          />

          <TextInput
            fieldName="scenario"
            class="text-sm"
            isMultiline
            value={scenarioText()}
            onChange={(ev) => setScenarioText(ev.currentTarget.value)}
            label={t('scenario')}
          />

          <TextInput
            fieldName="sampleChat"
            class="text-sm"
            isMultiline
            value={state.chat?.sampleChat || state.char?.sampleChat}
            label={t('sample_chat')}
          />

          <TextInput
            fieldName="systemPrompt"
            class="text-sm"
            label={t('character_system_prompt')}
            value={state.chat?.systemPrompt}
          />

          <TextInput
            fieldName="postHistoryInstructions"
            class="text-sm"
            label={t('character_post_history_instructions')}
            value={state.chat?.postHistoryInstructions}
          />

          <Select
            fieldName="schema"
            label={t('persona')}
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
