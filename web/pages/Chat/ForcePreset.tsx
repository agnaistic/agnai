import { Component, Show, createMemo, createSignal } from 'solid-js'
import { AppSchema } from '../../../srv/db/schema'
import Modal from '../../shared/Modal'
import { getPresetOptions } from '../../shared/adapter'
import { chatStore, presetStore, settingStore, toastStore } from '../../store'
import Select from '../../shared/Select'
import Button from '../../shared/Button'
import { ADAPTER_LABELS } from '../../../common/adapters'
import { isDefaultPreset } from '../../../common/presets'
import { A } from '@solidjs/router'

const ForcePresetModal: Component<{ chat: AppSchema.Chat; show: boolean; close: () => void }> = (
  props
) => {
  let ref: any
  const presets = presetStore((s) => s.presets)
  const adapters = settingStore((s) => s.config.adapters)
  const options = createMemo(() => getPresetOptions(presets).filter((pre) => pre.value !== 'chat'))

  const [presetId, setPresetId] = createSignal(props.chat.genPreset || options()[0].value)
  const [preset, setPreset] = createSignal<AppSchema.UserGenPreset>()
  const [service, setService] = createSignal<string>()

  const services = createMemo(() => {
    const list = adapters.map((adp) => ({ value: adp, label: ADAPTER_LABELS[adp] }))
    return [{ label: 'None', value: '' }].concat(list)
  })

  const savePreset = () => {
    const id = presetId()
    if (!id) {
      toastStore.error(`Please select a preset`)
      return
    }

    chatStore.editChatGenPreset(props.chat._id, id, props.close)

    const userPreset = preset()
    const svc = service()
    if (userPreset && !isDefaultPreset(userPreset._id)) {
      if (!svc) return

      presetStore.updatePreset(userPreset._id, { service: svc as any })
    }
  }

  const onPresetChange = (id: string) => {
    setPresetId(id)

    const userPreset = presets.find((p) => p._id === id)
    setService(userPreset?.service || '')
    setPreset(userPreset)
  }

  const Footer = (
    <>
      <Button onClick={savePreset} disabled={preset() && !preset()?.service && !service()}>
        Save
      </Button>
    </>
  )
  return (
    <Modal
      show={props.show}
      title="Select Chat Preset"
      close={props.close}
      footer={Footer}
      dismissable={false}
    >
      <form ref={ref}>
        <Select
          items={options()}
          label="Choose a Preset"
          helperText={
            <div class="flex flex-col gap-1">
              <div class="font-bold">Chats are now required to have a preset assigned.</div>
              <div>
                Unsure what to do? Use the <code>System Built-In Preset</code> You can change this
                at any time in your <b>Chat Generation Settings</b>.
              </div>
              <div>
                Alternatively, you can set a <code>Default Preset</code> in your{' '}
                <A href="/settings" class="link">
                  Settings
                </A>{' '}
                page.
              </div>
            </div>
          }
          fieldName="presetId"
          value={presetId()}
          onChange={(val) => onPresetChange(val.value)}
        />

        <Show when={preset() && !preset()?.service}>
          <Select
            fieldName="service"
            items={services()}
            label="AI Service"
            onChange={(val) => setService(val.value)}
            helperText={
              <>
                <div>
                  User Presets now require an AI service. Select an AI service for your preset.
                </div>
              </>
            }
          />
        </Show>
      </form>
      {/** TODO: Edit the preset if the user picks a preset that doesn't have a service configured */}
    </Modal>
  )
}

export default ForcePresetModal
