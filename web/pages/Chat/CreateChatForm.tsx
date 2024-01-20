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
import { TFunction } from 'i18next'
import { Trans, useTransContext } from '@mbarzda/solid-i18next'

const options = (t: TFunction) => [
  { value: 'wpp', label: t('w++') },
  { value: 'boostyle', label: t('boostyle') },
  { value: 'sbf', label: t('sbf') },
]

const CreateChatForm: Component<{
  footer?: (footer: JSX.Element) => void
  close?: () => void
  charId?: string
}> = (props) => {
  const [t] = useTransContext()

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
    if (!scenarios.length) return [{ value: '', label: t('you_have_no_scenarios') }]
    return [
      { value: '', label: t('none') },
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
    const opts = getPresetOptions(t, presets, { builtin: true }).filter(
      (pre) => pre.value !== 'chat'
    )
    return [
      { label: t('system_built_in_preset_horde'), value: AutoPreset.service, custom: false },
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
        {t('close')}
      </Button>

      <Button onClick={onCreate} disabled={!state.char}>
        <Check />
        {t('create')}
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
        <div class="mb-2 text-sm">{t('optionally_modify_some_of_the_conversation_context')}</div>
        <div class="mb-4 text-sm">{t('the_information_provided_here_is_only_applied')}</div>
        <div class="flex flex-col gap-3">
          <Show when={!props.charId}>
            <Card>
              <CharacterSelect
                class="w-48"
                items={state.chars}
                value={state.char}
                fieldName="character"
                label={t('character')}
                helperText={t('the_conversations_main_character')}
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
              label={t('chat_mode')}
              helperText={
                <div class="flex flex-col gap-2">
                  <TitleCard>
                    <Trans key="adventure_works_best_with_instruct_models">
                      <b>ADVENTURE:</b> Works best with instruct models (OpenAI, Claude, Scale).
                      This may not work as intended with other models.
                    </Trans>
                  </TitleCard>
                  <TitleCard>
                    <Trans key="companion_everything_is_permanent">
                      <b>COMPANION:</b> Everything is permanent. You will not be able to: Edit Chat,
                      Retry Message, Delete Messages, etc.
                    </Trans>
                  </TitleCard>
                </div>
              }
              items={[
                { label: t('conversation'), value: 'standard' },
                { label: t('companion'), value: 'companion' },
              ]}
              value={'standard'}
            />
          </Card>

          <Card>
            <TextInput
              class="text-sm"
              fieldName="name"
              label={t('conversation_name')}
              helperText={
                <span>
                  <Trans key="a_name_for_the_conversation_this_is_purely_for_labelling">
                    A name for the conversation. This is purely for labelling. <i>(Optional)</i>
                  </Trans>
                </span>
              }
              placeholder={t('untitled')}
            />
          </Card>
          <Card>
            <Toggle
              fieldName="useOverrides"
              value={useOverrides()}
              onChange={(use) => setUseOverrides(use)}
              label={t('override_character_definitions')}
              helperText={t('overrides_will_only_apply_to_the_newly_created_conversation')}
            />
          </Card>

          <Divider />

          <Select
            fieldName="scenarioId"
            label={t('scenario')}
            helperText={t('the_scenario_to_use_for_this_conversation')}
            items={currScenarios()}
            onChange={(option) => setScenarioById(option.value)}
            disabled={scenarios.length === 0}
          />

          <Card>
            <TextInput
              isMultiline
              fieldName="greeting"
              label={t('greeting')}
              value={state.char?.greeting}
              class="text-xs"
              disabled={!useOverrides()}
            ></TextInput>
          </Card>
          <Card>
            <TextInput
              isMultiline
              fieldName="scenario"
              label={t('scenario')}
              value={state.char?.scenario}
              class="text-xs"
              disabled={!useOverrides()}
            ></TextInput>
          </Card>

          <Card>
            <TextInput
              isMultiline
              fieldName="sampleChat"
              label={t('sample_chat')}
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
                label={t('persona')}
                items={options(t)}
                value={state.char?.persona.kind || 'wpp'}
                disabled={!useOverrides()}
              />
            </Show>

            <Show when={state.char?.persona.kind === 'text'}>
              <Select
                class="mb-2 text-sm"
                fieldName="schema"
                label={t('persona')}
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
