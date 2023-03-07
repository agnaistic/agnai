import { Save, X } from 'lucide-solid'
import { Component, createEffect, createSignal, Show } from 'solid-js'
import { defaultPresets } from '../../../common/presets'
import { AppSchema } from '../../../srv/db/schema'
import Button from '../../shared/Button'
import Dropdown from '../../shared/Dropdown'
import GenerationSettings, { genSettings } from '../../shared/GenerationSettings'
import Modal from '../../shared/Modal'
import { Toggle } from '../../shared/Toggle'
import { getStrictForm } from '../../shared/util'
import { chatStore, guestStore, userStore } from '../../store'
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
  let ref: any

  const state = presetStore(({ presets }) => ({
    presets: [{ label: 'None', value: '' }].concat(
      presets.map((pre) => ({ label: pre.name, value: pre._id }))
    ),
  }))

  createEffect(() => {
    if (userStore().loggedIn) presetStore.getPresets()

    if (props.chat) {
      setUsePreset(!!props.chat.genPreset)
    }
  })

  const onSave = () => {
    const loggedIn = userStore().loggedIn
    if (usePreset()) {
      const body = getStrictForm(ref, { preset: 'string' })
      if (loggedIn) chatStore.editChatGenPreset(props.chat._id, body.preset, props.close)
      else
        guestStore.editChat(
          props.chat._id,
          { genPreset: body.preset, genSettings: undefined },
          props.close
        )
    } else {
      const body = getStrictForm(ref, genSettings)
      if (loggedIn) chatStore.editChatGenSettings(props.chat._id, body, props.close)
      else
        guestStore.editChat(
          props.chat._id,
          { genPreset: undefined, genSettings: body },
          props.close
        )
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
            items={state.presets.concat(presetList)}
            value={props.chat.genPreset}
            disabled={!usePreset()}
          />

          <GenerationSettings inherit={props.chat.genSettings} disabled={usePreset()} />
        </form>
      </div>
    </Modal>
  )
}
