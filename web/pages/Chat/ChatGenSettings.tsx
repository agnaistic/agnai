import { Save, X } from 'lucide-solid'
import { Component, createMemo, createSignal, For, Match, Show, Switch } from 'solid-js'
import {
  chatGenSettings,
  defaultPresets,
  getFallbackPreset,
  isDefaultPreset,
} from '../../../common/presets'
import { AppSchema } from '../../../srv/db/schema'
import Button from '../../shared/Button'
import GenerationSettings from '../../shared/GenerationSettings'
import { getStrictForm } from '../../shared/util'
import { chatStore, toastStore, userStore } from '../../store'
import { presetStore } from '../../store'
import { getAdapter } from '../../../common/prompt'
import { AIAdapter, AI_ADAPTERS } from '../../../common/adapters'
import { AutoPreset, getPresetOptions } from '../../shared/adapter'
import { A } from '@solidjs/router'
import ServiceWarning from '/web/shared/ServiceWarning'
import { Convertible, ConvertibleMode } from './Convertible'
import { PresetSelect } from '/web/shared/PresetSelect'
import { Card } from '/web/shared/Card'
import { usePane } from '/web/shared/hooks'

export const ChatGenSettings: Component<{
  chat: AppSchema.Chat
  mode: ConvertibleMode
}> = (props) => {
  let ref: any
  const user = userStore()
  const state = presetStore(({ presets }) => ({
    presets,
    options: presets.map((pre) => ({ label: pre.name, value: pre._id })),
  }))

  const paneOrPopup = usePane()
  const presetOptions = createMemo(() =>
    getPresetOptions(state.presets, { builtin: true, base: true })
  )

  const presets = createMemo(() => {
    const all: Partial<AppSchema.UserGenPreset>[] = state.presets
    const defaults = Object.entries(defaultPresets).map<Partial<AppSchema.UserGenPreset>>(
      ([key, preset]) => ({ ...preset, _id: key, name: `Default - ${preset.name}` })
    )

    return all.concat(defaults)
  })

  const [selected, setSelected] = createSignal<string>(
    props.chat?.genPreset
      ? props.chat.genPreset
      : props.chat.genSettings
      ? AutoPreset.chat
      : AutoPreset.service
  )
  const [genAdapter, setAdapter] = createSignal<AIAdapter>()

  const servicePreset = createMemo(() => {
    if (!user.user) return

    const current = selected()
    if (isDefaultPreset(current)) {
      const preset = defaultPresets[current]
      return { name: preset.name, preset, fallback: true }
    }

    const adapter = genAdapter() || getAdapter(props.chat, user.user).adapter

    if (!user.user.defaultPresets) {
      const preset = getFallbackPreset(adapter)
      const name = 'name' in preset ? `${preset.name} - Fallback Preset` : 'Fallback Preset'
      return { name, preset, fallback: true }
    }

    const presetId = user.user.defaultPresets[adapter]
    const preset = isDefaultPreset(presetId)
      ? defaultPresets[presetId]
      : state.presets.find((pre) => pre._id === presetId)

    if (!preset) return
    const fallback = isDefaultPreset(presetId)
    const name =
      'name' in preset
        ? `${preset.name} - ${fallback ? 'Fallback' : 'Service'} Preset`
        : 'Fallback Preset'
    return { name, preset, fallback: isDefaultPreset(presetId) }
  })

  const onSave = () => {
    const preset = selected()
    if (preset === AutoPreset.chat) {
      const body = getStrictForm(ref, chatGenSettings)
      chatStore.editChatGenSettings(props.chat._id, body, props.mode.close)
    } else if (preset === AutoPreset.service) {
      chatStore.editChat(props.chat._id, { genPreset: preset, genSettings: undefined }, undefined)
    } else {
      chatStore.editChatGenPreset(props.chat._id, preset, () => {
        if (props.mode.kind === 'paneOrPopup' && paneOrPopup() === 'popup') {
          props.mode.close?.()
        }

        if (isDefaultPreset(preset)) {
          toastStore.success('Preset changed')
        }
      })

      if (!isDefaultPreset(preset)) {
        const validator = { ...chatGenSettings, service: ['', ...AI_ADAPTERS] } as const
        const update = getStrictForm(ref, validator)
        if (update.service === '') {
          toastStore.error(`You must select an AI service before saving`)
          return
        }

        presetStore.updatePreset(preset, update as any)
      }
    }
  }

  const title = 'Preset Settings'
  const footer = (
    <>
      <Button schema="secondary" onClick={() => props.mode.close?.()}>
        <X /> {props.mode.kind === 'paneOrPopup' ? 'Close' : 'Cancel'}
      </Button>

      <Button onClick={onSave}>
        <Save /> Save
      </Button>
    </>
  )
  const body = (
    <div class="text-sm">
      <form ref={ref} class="flex flex-col gap-4">
        <Card class="flex flex-col gap-2">
          <PresetSelect
            options={presetOptions()}
            selected={selected()}
            setPresetId={(val) => setSelected(val)}
          />

          <ServiceWarning service={servicePreset()?.preset.service} />
          <Show when={isDefaultPreset(selected())}>
            <span class="text-[var(--hl-100)]">
              You are using a built-in preset which cannot be modified. Head to the{' '}
              <A href="/presets" class="link">
                Presets
              </A>{' '}
              page to create a preset or{' '}
              <A href={`/presets/new?preset=${selected()}`} class="link">
                Duplicate
              </A>{' '}
              this one.
            </span>
          </Show>
        </Card>

        <Switch>
          <Match when={selected() === AutoPreset.service && servicePreset()}>
            <GenerationSettings
              inherit={servicePreset()!.preset}
              disabled={servicePreset()?.fallback}
              onService={setAdapter}
              disableService
            />
          </Match>

          <Match when={selected() === AutoPreset.chat}>
            <div class="bold text-md">Using: Chat Settings</div>
            <GenerationSettings inherit={props.chat.genSettings} onService={setAdapter} />
          </Match>

          <Match when={true}>
            <For each={presets()}>
              {(preset) => (
                <Show when={selected() === preset._id!}>
                  <GenerationSettings
                    inherit={preset}
                    disabled={isDefaultPreset(selected())}
                    onService={setAdapter}
                  />
                </Show>
              )}
            </For>
          </Match>
        </Switch>
      </form>
    </div>
  )

  return <Convertible title={title} footer={footer} body={body} mode={props.mode} />
}
