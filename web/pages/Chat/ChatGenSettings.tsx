import { Save, X } from 'lucide-solid'
import { Component, createEffect, createMemo, createSignal, For, Show } from 'solid-js'
import { chatGenSettings, defaultPresets, isDefaultPreset } from '../../../common/presets'
import { AppSchema } from '../../../srv/db/schema'
import Button from '../../shared/Button'
import Select from '../../shared/Select'
import GenerationSettings from '../../shared/GenerationSettings'
import Modal from '../../shared/Modal'
import { Toggle } from '../../shared/Toggle'
import { getStrictForm } from '../../shared/util'
import { chatStore } from '../../store'
import { presetStore } from '../../store'

const presetList = Object.entries(defaultPresets).map(([key, preset]) => ({
  label: preset.name,
  value: key,
}))

export const ChatGenSettingsModal: Component<{
  chat: AppSchema.Chat
  show: boolean
  close: () => void
}> = (props) => {
  const [usePreset, setUsePreset] = createSignal(!!props.chat?.genPreset)
  const [selected, setSelected] = createSignal(props.chat?.genPreset)

  let ref: any

  const state = presetStore(({ presets }) => ({
    presets,
    options: [{ label: 'Service Preset or Fallback', value: '' }].concat(
      presets.map((pre) => ({ label: pre.name, value: pre._id }))
    ),
  }))

  const presets = createMemo(() => {
    const all: Partial<AppSchema.UserGenPreset>[] = state.presets
    const defaults = Object.entries(defaultPresets).map<Partial<AppSchema.UserGenPreset>>(
      ([key, preset]) => ({ ...preset, _id: key })
    )

    return all.concat(defaults)
  })

  createEffect(() => {
    if (props.chat) {
      setUsePreset(!!props.chat.genPreset)
      setSelected(props.chat.genPreset)
    }
  })

  const onSave = () => {
    if (usePreset()) {
      const body = getStrictForm(ref, { preset: 'string' })
      chatStore.editChatGenPreset(props.chat._id, body.preset, props.close)
      if (body.preset && !isDefaultPreset(body.preset)) {
        const update = getStrictForm(ref, chatGenSettings)
        presetStore.updatePreset(body.preset, update)
      }
    } else {
      const body = getStrictForm(ref, chatGenSettings)
      chatStore.editChatGenSettings(props.chat._id, body, props.close)
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
        <div class="mb-2 flex items-center gap-4">
          <div>Use Preset</div>
          <div>
            <Toggle
              fieldName={'usePreset'}
              onChange={(value) => setUsePreset(value)}
              value={usePreset()}
            />
          </div>
        </div>

        <form ref={ref} class="flex flex-col gap-2">
          <Select
            fieldName="preset"
            items={state.options.concat(presetList)}
            value={props.chat.genPreset}
            disabled={!usePreset()}
            onChange={(item) => setSelected(item.value)}
          />

          <Show when={usePreset()}>
            <For each={presets()}>
              {(preset) => (
                <Show when={selected() === preset._id!}>
                  <div class="bold text-md">Using: {preset.name}</div>
                  <GenerationSettings
                    showAll
                    inherit={preset}
                    disabled={isDefaultPreset(selected())}
                  />
                </Show>
              )}
            </For>
          </Show>

          <Show when={!usePreset()}>
            <div class="bold text-md">Using: Custom Preset</div>
            <GenerationSettings showAll inherit={props.chat.genSettings} />
          </Show>
        </form>
      </div>
    </Modal>
  )
}
