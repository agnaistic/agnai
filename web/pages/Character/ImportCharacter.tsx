import { Import, X } from 'lucide-solid'
import { Component, createSignal } from 'solid-js'
import Button from '../../shared/Button'
import FileInput, { FileInputResult } from '../../shared/FileInput'
import Modal, { ModalFooter } from '../../shared/Modal'
import { characterStore, toastStore } from '../../store'

const ImportCharacterModal: Component<{ show: boolean; close: () => void }> = (props) => {
  let ref: HTMLInputElement | undefined
  const [avatar, setAvatar] = createSignal<string | undefined>(undefined)

  const updateFile = (files: FileInputResult[]) => {
    if (!files.length) setAvatar()
    else setAvatar(files[0].content)
  }

  const onImport = async () => {
    if (!ref || !ref.files) return
    const [file] = Array.from(ref.files)
    if (!file) return

    const buffer = await file.arrayBuffer().then((ab) => Buffer.from(ab))
    try {
      const json = JSON.parse(buffer.toString())
      characterStore.createCharacter({ ...json, avatar }, props.close)
    } catch (ex) {
      toastStore.warn('Invalid file format')
    }
  }

  return (
    <Modal show={props.show} title="Import Character">
      <div class="flex flex-col gap-2">
        <FileInput
          ref={ref}
          label="JSON File"
          fieldName="json"
          accept="text/json"
          helperText="Currently only JSON files exported from Agnaistic are supported"
          required
        />

        <FileInput
          fieldName="avatar"
          label="Avatar"
          accept="image/png,image/jpeg"
          onUpdate={updateFile}
        />

        <ModalFooter>
          <Button schema="secondary" onClick={props.close}>
            <X />
            Cancel
          </Button>

          <Button onClick={onImport}>
            <Import />
            Import
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  )
}

export default ImportCharacterModal
