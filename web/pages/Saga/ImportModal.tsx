import Modal from '/web/shared/Modal'
import FileInput, { FileInputResult, getFileAsString } from '/web/shared/FileInput'
import { importTemplate } from './util'
import { toastStore } from '/web/store'
import { sagaStore } from './state'

export const ImportTemplate = () => {
  const onChange = async (files: FileInputResult[]) => {
    if (!files.length) {
      return
    }

    try {
      const content = await getFileAsString(files[0])
      const parsed = JSON.parse(content)
      importTemplate(parsed)
      toastStore.success('Successfully imported template')
      sagaStore.setState({ showModal: 'none' })
    } catch (ex: any) {
      toastStore.error(ex.message)
      return
    }
  }

  return (
    <Modal show close={() => sagaStore.setState({ showModal: 'none' })} title="Import Template">
      <FileInput fieldName="file" label="Template JSON" onUpdate={onChange} />
    </Modal>
  )
}
