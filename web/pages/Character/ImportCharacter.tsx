import { Import, X } from 'lucide-solid'
import { Component, createSignal } from 'solid-js'
import Button from '../../shared/Button'
import FileInput, { FileInputResult, getFileAsString } from '../../shared/FileInput'
import Modal, { ModalFooter } from '../../shared/Modal'
import { characterStore, toastStore } from '../../store'

const ImportCharacterModal: Component<{ show: boolean; close: () => void }> = (props) => {
  const [json, setJson] = createSignal<any>(undefined)
  const [avatar, setAvatar] = createSignal<string | undefined>(undefined)

  const updateJson = async (files: FileInputResult[]) => {
    if (!files.length) return setJson()
    try {
      const content = await getFileAsString(files[0])
      const json = JSON.parse(content)
      setJson(json)
    } catch (ex) {
      toastStore.warn('Invalid file format: Must be exported from Agnaistic')
    }
  }

  const updateAvatar = (files: FileInputResult[]) => {
    if (!files.length) setAvatar()
    else setAvatar(files[0].content)
  }

  const onImport = async () => {
    if (!json()) return
    characterStore.createCharacter({ ...json(), avatar }, props.close)
  }

  return (
    <Modal show={props.show} title="Import Character" close={props.close}>
      <div class="flex flex-col gap-2">
        <FileInput
          label="JSON File"
          fieldName="json"
          accept="text/json"
          helperText="Currently only JSON files exported from Agnaistic are supported"
          required
          onUpdate={updateJson}
        />

        <FileInput
          fieldName="avatar"
          label="Avatar"
          accept="image/png,image/jpeg"
          onUpdate={updateAvatar}
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
