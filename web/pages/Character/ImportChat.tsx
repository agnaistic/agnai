import { Component, createSignal } from 'solid-js'
import { X } from 'lucide-solid'
import { AppSchema } from '../../../srv/db/schema'
import Button from '../../shared/Button'
import FileInput, { FileInputResult } from '../../shared/FileInput'
import Modal from '../../shared/Modal'
import { toastStore } from '../../store'

export type ImportChat = AppSchema.Chat & { json?: File }

const ImportChatModal: Component<{
  show: boolean
  close: () => void
  onSave: (chat: any) => void
  char?: AppSchema.Character
}> = (props) => {
  const [json, setJson] = createSignal<any>(undefined)

  const updateJson = async (files: FileInputResult[]) => {
    if (!files.length) return setJson()
    try {
      const content = await files[0].file.text()
      const json = JSON.parse(content)
      // importJson(json)
      toastStore.success('Chat file accepted')
    } catch (ex) {
      toastStore.warn('Invalid file format. Supported formats: TavernAI')
    }
  }

  return (
    <Modal
      show={props.show}
      title={`Import Chat Log for ${props.char?.name}`}
      close={props.close}
      footer={
        <>
          <Button schema="secondary" onClick={props.close}>
            <X />
            Cancel
          </Button>
          <Button onClick={() => {}}>Import</Button>
        </>
      }
    >
      <div class="flex flex-col gap-2">
        <FileInput
          label="JSON Lines File (.jsonl)"
          fieldName="json"
          accept="application/json-lines,application/jsonl,text/jsonl"
          helperText="Supported formats: TavernAI"
          required
          onUpdate={updateJson}
        />
      </div>
    </Modal>
  )
}

export default ImportChatModal
