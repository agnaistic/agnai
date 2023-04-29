import { Save, X } from 'lucide-solid'
import { Component, createEffect, createMemo, createSignal, For, Show } from 'solid-js'
import {
  chatGenSettings,
  defaultPresets,
  getFallbackPreset,
  isDefaultPreset,
} from '../../../common/presets'
import { AppSchema } from '../../../srv/db/schema'
import Button from '../../shared/Button'
import Select from '../../shared/Select'
import GenerationSettings from '../../shared/GenerationSettings'
import Modal from '../../shared/Modal'
import { getStrictForm } from '../../shared/util'
import { chatStore, toastStore, userStore } from '../../store'
import { presetStore } from '../../store'
import { Option } from '../../shared/Select'
import { getAdapter } from '../../../common/prompt'

const AutoPreset = {
  chat: 'chat',
  service: 'service',
}

const autoPresets: Option[] = [
  { label: 'Chat Settings', value: AutoPreset.chat },
  { label: 'Service or Fallback Preset', value: AutoPreset.service },
]

const presetList = Object.entries(defaultPresets).map(([key, preset]) => ({
  label: preset.name,
  value: key,
}))

export const ChatGenSettingsModal: Component<{
  chat: AppSchema.Chat
  show: boolean
  close: () => void
}> = (props) => {
  let ref: any
  const user = userStore()
  const state = presetStore(({ presets }) => ({
    presets,
    options: presets.map((pre) => ({ label: pre.name, value: pre._id })),
  }))

  const presets = createMemo(() => {
    const all: Partial<AppSchema.UserGenPreset>[] = state.presets
    const defaults = Object.entries(defaultPresets).map<Partial<AppSchema.UserGenPreset>>(
      ([key, preset]) => ({ ...preset, _id: key, name: `Default - ${preset.name}` })
    )

    return all.concat(defaults)
  })

  const [selected, setSelected] = createSignal(props.chat?.genPreset)

  createEffect(() => {
    if (props.chat) {
      setSelected(props.chat.genPreset)
    }
  })

  const servicePreset = createMemo(() => {
    if (!user.user) return
    const { adapter } = getAdapter(props.chat, user.user)

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
    const { preset } = getStrictForm(ref, { preset: 'string' })
    if (preset === AutoPreset.chat) {
      const body = getStrictForm(ref, chatGenSettings)
      chatStore.editChatGenSettings(props.chat._id, body, props.close)
    } else if (preset === AutoPreset.service) {
      chatStore.editChat(props.chat._id, { genPreset: '', genSettings: undefined })
    } else {
      chatStore.editChatGenPreset(props.chat._id, preset, () => {
        props.close()
        if (isDefaultPreset(preset)) {
          toastStore.success('Preset changed')
        }
      })
      if (!isDefaultPreset(preset)) {
        const update = getStrictForm(ref, chatGenSettings)
        presetStore.updatePreset(preset, update)
      }
    }
  }

  const Footer = (
    <>
      <Button schema="secondary" onClick={props.close}>
        <X /> Cancel
      </Button>

      <Button onClick={onSave}>
        <Save /> Save
      </Button>
    </>
  )

  return (
    <Modal
      show={props.show}
      close={props.close}
      footer={Footer}
      title="Chat Generation Settings"
      fixedHeight
      maxWidth="half"
    >
      <div class="text-sm">
        <form ref={ref} class="flex flex-col gap-2">
          <Select
            fieldName="preset"
            items={autoPresets.concat(state.options).concat(presetList)}
            value={props.chat.genPreset}
            onChange={(item) => setSelected(item.value)}
          />

          <Show when={selected() === AutoPreset.service && servicePreset()}>
            <div class="bold text-md">Using: {servicePreset()!.name}</div>
            <GenerationSettings
              showAll
              inherit={servicePreset()!.preset}
              disabled={servicePreset()?.fallback}
            />
          </Show>

          <For each={presets()}>
            {(preset) => (
              <Show when={selected() === preset._id!}>
                <div class="bold text-md">Using: {preset.name} (User Preset)</div>
                <GenerationSettings
                  showAll
                  inherit={preset}
                  disabled={isDefaultPreset(selected())}
                />
              </Show>
            )}
          </For>

          <Show when={selected() === AutoPreset.chat}>
            <div class="bold text-md">Using: Chat Settings</div>
            <GenerationSettings showAll inherit={props.chat.genSettings} />
          </Show>
        </form>
      </div>
    </Modal>
  )
}
