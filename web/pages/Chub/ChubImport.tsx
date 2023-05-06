import { useNavigate } from '@solidjs/router'
import { Check, X } from 'lucide-solid'
import { Component, createEffect, createMemo, createSignal, For, Show } from 'solid-js'
import { AppSchema } from '../../../srv/db/schema'
import Button from '../../shared/Button'
import Modal from '../../shared/Modal'
import PersonaAttributes, { getAttributeMap } from '../../shared/PersonaAttributes'
import TextInput from '../../shared/TextInput'
import { getStrictForm } from '../../shared/util'
import { NewCharacter, characterStore, chatStore, toastStore } from '../../store'

const ChubImportModal: Component<{
  show: boolean
  close: () => void
  id?: string
  char: NewCharacter
}> = (props) => {
  let ref: any

  const onImport = () => {
    try {
      console.log('NJEG')
      toastStore.success(`Successfully imported ${props.char?.name}!`)
    } catch (error) {
      toastStore.error(`Error importing ${props.char?.name}! ${error}`)
    }
    props.close()
  }

  return (
    <Modal
      show={props.show}
      close={props.close}
      title={`Preview ${props.char?.name}`}
      maxWidth="half"
      footer={
        <>
          <Button schema="secondary" onClick={props.close}>
            <X />
            Close
          </Button>

          <Button onClick={onImport} disabled={!props.char}>
            <Check />
            Import
          </Button>
        </>
      }
    >
      <form ref={ref}>
        <div class="mb-2 text-sm">
          Optionally modify some of the conversation context. You can override other aspects of the
          character's persona from the conversation after it is created.
        </div>
        <div class="mb-4 text-sm">
          The information provided here will be saved with the character on import.
        </div>

        <TextInput
          class="text-sm"
          fieldName="name"
          label="Character Name"
          helperText={
            <span>
              Override the name of the character here <i>(Optional)</i>
            </span>
          }
          value={props.char?.name}
        />
        <TextInput
          isMultiline
          fieldName="greeting"
          label="Greeting"
          value={props.char?.greeting}
          class="text-xs"
        ></TextInput>

        <TextInput
          isMultiline
          fieldName="scenario"
          label="Scenario"
          value={props.char?.scenario}
          class="text-xs"
        ></TextInput>

        <TextInput
          isMultiline
          fieldName="sampleChat"
          label="Sample Chat"
          value={props.char?.sampleChat}
          class="text-xs"
        ></TextInput>

        <TextInput
          isMultiline
          fieldName="persona"
          label="Persona"
          value={props.char?.persona.attributes.text[0]! || ''}
          class="text-xs"
        ></TextInput>
      </form>
    </Modal>
  )
}

export default ChubImportModal
