import { Save, X } from 'lucide-solid'
import { Component } from 'solid-js'
import { AppSchema } from '../../../srv/db/schema'
import Button from '../../shared/Button'
import GenerationSettings, { genSettings } from '../../shared/GenSettings'
import Modal from '../../shared/Modal'
import { Toggle } from '../../shared/Toggle'
import { getStrictForm } from '../../shared/util'
import { chatStore } from '../../store'

export const ChatGenSettingsModal: Component<{
  chat: AppSchema.Chat
  show: boolean
  close: () => void
}> = (props) => {
  let ref: any

  const onSave = () => {
    const body = getStrictForm(ref, genSettings)
    chatStore.editChatGenSettings(props.chat._id, body, props.close)
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
        <Toggle fieldName={'usePreset'} label="Use Preset" />
        <form ref={ref}>
          <GenerationSettings inherit={props.chat.genSettings} />
        </form>
      </div>
    </Modal>
  )
}
