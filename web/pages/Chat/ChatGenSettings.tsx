import { Save, X } from 'lucide-solid'
import { Component, createEffect, createMemo, createSignal, For, Show } from 'solid-js'
import { defaultPresets, GenerationPreset } from '../../../common/presets'
import { AppSchema } from '../../../srv/db/schema'
import Button from '../../shared/Button'
import Dropdown from '../../shared/Dropdown'
import GenerationSettings, { genSettings } from '../../shared/GenerationSettings'
import Modal from '../../shared/Modal'
import { Toggle } from '../../shared/Toggle'
import { getStrictForm } from '../../shared/util'
import { chatStore } from '../../store'
import { presetStore } from '../../store/presets'

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
    options: [{ label: 'None', value: '' }].concat(
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
    presetStore.getPresets()

    if (props.chat) {
      setUsePreset(!!props.chat.genPreset)
      setSelected(props.chat.genPreset)
    }
  })

  const onSave = () => {
    if (usePreset()) {
      const body = getStrictForm(ref, { preset: 'string' })
      chatStore.editChatGenPreset(props.chat._id, body.preset, props.close)
    } else {
      const body = getStrictForm(ref, genSettings)
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
    <Modal show={props.show} close={props.close} footer={Footer} title="Chat Generation Settings">
      <div class="text-sm">
        <Toggle
          fieldName={'usePreset'}
          label="Use Preset"
          onChange={(value) => setUsePreset(value)}
          value={usePreset()}
        />

        <form ref={ref}>
          <Dropdown
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
                  <GenerationSettings inherit={preset} disabled />
                </Show>
              )}
            </For>
          </Show>

          <Show when={!usePreset()}>
            <div class="bold text-md">Using: Custom Preset</div>
            <GenerationSettings inherit={props.chat.genSettings} />
          </Show>
        </form>
      </div>
    </Modal>
  )
}
