import { Component, Show, createEffect, createMemo, on, onMount } from 'solid-js'
import { AppSchema } from '../../../common/types/schema'
import Button from '../../shared/Button'
import Select from '../../shared/Select'
import PersonaAttributes, { fromAttrs, toAttrs } from '../../shared/PersonaAttributes'
import TextInput from '../../shared/TextInput'
import { chatStore, msgStore, presetStore, scenarioStore, userStore } from '../../store'
import { FormLabel } from '../../shared/FormLabel'
import { defaultPresets, isDefaultPreset } from '/common/presets'
import { Card, TitleCard } from '/web/shared/Card'
import { Toggle } from '/web/shared/Toggle'
import TagInput from '/web/shared/TagInput'
import { usePane } from '/web/shared/hooks'
import Divider from '/web/shared/Divider'
import { Image, Wand } from 'lucide-solid'
import { createStore } from 'solid-js/store'

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
  const [edit, setEdit] = createStore(getInitState(state.chat, state.char))
  const user = userStore()
  const presets = presetStore((s) => s.presets)
  const scenarioState = scenarioStore()
  const pane = usePane()

  const personaFormats = createMemo(() => {
    const format = edit.personaKind
    if (!format || format in backupFormats === false) return formatOptions

    return formatOptions.concat(backupFormats[format])
  })

  const activePreset = createMemo(() => {
    const presetId = state.chat?.genPreset
    if (!presetId) return

    if (isDefaultPreset(presetId)) return defaultPresets[presetId]
    return presets.find((pre) => pre._id === presetId)
  })

  createEffect(
    on(
      () => [state.chat, state.char] as const,
      ([chat, char]) => {
        if (!chat || !char) return
        setEdit(getInitState(chat, char))
      }
    )
  )

  onMount(() => scenarioStore.getAll())

  createEffect(() => {
    setEdit('scenarioId', state.chat?.scenarioIds?.[0] || '')
  })

  createEffect(() => {
    const currentText = edit.scenario
    const scenario = scenarioState.scenarios.find((s) => s._id === edit.scenarioId)
    if (scenario?.overwriteCharacterScenario && !state.chat?.scenarioIds?.includes(scenario._id)) {
      setEdit('scenario', scenario.text)
    } else {
      setEdit('scenario', currentText)
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
    const payload = {
      name: edit.name,
      greeting: edit.greeting,
      sampleChat: edit.sampleChat,
      systemPrompt: edit.systemPrompt,
      postHistoryInstructions: edit.postHistoryInstructions,
      scenario: edit.scenario,
      overrides: {
        kind: edit.personaKind,
        attributes: fromAttrs(edit.personaAttrs),
      },
      imageSource: edit.imageSource,
      scenarioIds: edit.scenarioId ? [edit.scenarioId] : [],
      scenarioStates: edit.scenarioStates,
    }
    chatStore.editChat(state.chat?._id!, payload, edit.useOverrides, () => {
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

  onMount(() => props.footer(Footer))

  return (
    <form class="flex flex-col gap-3">
      <Show when={user.user?.admin}>
        <Card class="text-xs">{state.chat?._id}</Card>
      </Show>

      <Card>
        <Select
          fieldName="imageSource"
          label="Image Source"
          helperText={<>Which settings to use when generating images for this chat</>}
          items={[
            { label: 'Main Character', value: 'main-character' },
            { label: 'Last Character to Speak', value: 'last-character' },
            { label: 'Chat Settings', value: 'chat' },
            { label: 'App Settings', value: 'settings' },
          ]}
          value={edit.imageSource}
          onChange={(ev) => setEdit('imageSource', ev.value as any)}
        />
      </Card>

      <Show when={activePreset()?.service !== 'horde'}>
        <Card>
          <Select
            fieldName="mode"
            label="Chat Mode"
            helperText={
              <>
                <Show when={state.chat?.mode !== 'companion' && edit.mode === 'companion'}>
                  <TitleCard type="orange">
                    Warning! Switching to COMPANION mode is irreversible! You will no longer be able
                    to: retry messages, delete chats, edit chat settings.
                  </TitleCard>
                </Show>
              </>
            }
            items={[
              { label: 'Conversation', value: 'standard' },
              { label: 'Companion', value: 'companion' },
            ]}
            value={edit.mode}
            onChange={(ev) => setEdit('mode', ev.value as any)}
          />
        </Card>
      </Show>
      <Card>
        <TextInput
          class="text-sm"
          value={edit?.name || ''}
          onChange={(ev) => setEdit('name', ev.currentTarget.value)}
          label={
            <>
              Chat name{' '}
              <div
                onClick={() =>
                  msgStore.chatQuery('Generate a name for this conversation', (msg) =>
                    setEdit('name', msg)
                  )
                }
              >
                <Wand />
              </div>
            </>
          }
        />
      </Card>
      <Card>
        <Toggle
          value={edit.useOverrides}
          onChange={(ev) => setEdit('useOverrides', ev)}
          label="Override Character Definitions"
          helperText="Overrides apply to this chat only. If you want to edit the original character, open the 'Character' link in the Chat Menu instead."
        />
      </Card>

      <Show when={scenarios().length > 1}>
        <Card>
          <Select
            label="Scenario"
            helperText="The scenario to use for this conversation"
            items={scenarios()}
            value={edit.scenarioId}
            onChange={(ev) => setEdit('scenarioId', ev.value)}
          />

          <Show when={edit.scenarioId !== ''}>
            <TagInput
              availableTags={[]}
              onSelect={(tags) => setEdit('scenarioStates', tags)}
              label="The current state of the scenario"
              helperText="What flags have been set in the chat by the scenario so far"
              value={edit.scenarioStates}
            />
          </Show>
        </Card>
      </Show>

      <Show when={edit.useOverrides}>
        <Card>
          <TextInput
            class="text-sm"
            isMultiline
            label="Greeting"
            value={edit.greeting}
            onChange={(ev) => setEdit('greeting', ev.currentTarget.value)}
          />

          <TextInput
            class="text-sm"
            isMultiline
            value={edit.scenario}
            onChange={(ev) => setEdit('scenario', ev.currentTarget.value)}
            label="Scenario"
          />

          <TextInput
            class="text-sm"
            isMultiline
            label="Sample Chat"
            value={edit.sampleChat}
            onChange={(ev) => setEdit('sampleChat', ev.currentTarget.value)}
          />

          <TextInput
            class="text-sm"
            label="Character System Prompt"
            value={edit.systemPrompt}
            onChange={(ev) => setEdit('systemPrompt', ev.currentTarget.value)}
          />

          <TextInput
            class="text-sm"
            label="Character Post-History Instructions"
            value={edit.postHistoryInstructions}
            onChange={(ev) => setEdit('postHistoryInstructions', ev.currentTarget.value)}
          />

          <Select
            fieldName="schema"
            label="Persona"
            items={personaFormats()}
            value={edit.personaKind}
            onChange={(ev) => setEdit('personaKind', ev.value as any)}
          />
          <div class="mt-4 flex flex-col gap-2 text-sm">
            <PersonaAttributes
              state={edit.personaAttrs}
              setter={(next) => setEdit('personaAttrs', next)}
              hideLabel
              schema={edit.personaKind}
            />
          </div>
        </Card>
      </Show>

      <Divider />

      <FormLabel
        label="Image Generation Settings"
        helperMarkdown="These settings will be used to for image generation if the `Image Source` is set `Chat`"
      />
      <div class="flex gap-2">
        Image Settings have moved: Click the <Image size={16} />
        in the main menu
      </div>
    </form>
  )
}

function getInitState(chat?: AppSchema.Chat, char?: AppSchema.Character) {
  return {
    name: chat?.name || '',
    imageSource: chat?.imageSource || 'settings',
    mode: chat?.mode || 'standard',
    useOverrides: !!chat?.overrides,
    scenarioId: chat?.scenarioIds?.[0] || '',
    scenarioStates: chat?.scenarioStates || [],

    greeting: chat?.greeting || char?.greeting || '',
    scenario: chat?.scenario || char?.scenario || '',
    sampleChat: chat?.sampleChat || char?.sampleChat || '',
    systemPrompt: chat?.systemPrompt || '',
    postHistoryInstructions: chat?.postHistoryInstructions || '',

    personaKind: chat?.overrides?.kind || char?.persona.kind || 'text',
    personaAttrs: toAttrs(chat?.overrides?.attributes || char?.persona.attributes),
  }
}

export default ChatSettings
