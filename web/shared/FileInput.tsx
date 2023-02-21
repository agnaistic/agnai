import { Component, JSX } from 'solid-js'
import { FormLabel } from './FormLabel'

export type FileInputResult = { file: File; content: string }

const FileInput: Component<{
  fieldName: string
  required?: boolean
  label?: string
  helperText?: JSX.Element
  accept?: string
  onUpdate?: (files: FileInputResult[]) => void
}> = (props) => {
  const onFile = async (list: FileList | null) => {
    if (!props.onUpdate) return
    if (!list) {
      return props.onUpdate([])
    }

    const files = await Promise.all(Array.from(list).map(getBuffer))
    props.onUpdate(files)
  }

  return (
    <div>
      <FormLabel fieldName={props.fieldName} label={props.label} helperText={props.helperText} />
      <input
        id={props.fieldName}
        name={props.fieldName}
        type="file"
        accept={props.accept}
        class="w-full rounded-xl bg-white/5"
        onChange={(ev) => onFile(ev.currentTarget.files)}
      />
    </div>
  )
}

function getBuffer(file: File): Promise<{ file: File; content: string }> {
  return new Promise((resolve) => {
    let content: any
    const reader = new FileReader()
    reader.onload = (ev) => {
      content = ev.target?.result
    }
    reader.onloadend = () => resolve({ file, content })
    reader.readAsDataURL(file)
  })
}

export default FileInput
