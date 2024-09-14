import { Component, JSX } from 'solid-js'
import { FormLabel } from './FormLabel'

export type FileInputResult = { file: File; content: string }

const FileInput: Component<{
  ref?: (ref: HTMLInputElement) => void
  class?: string
  fieldName: string
  required?: boolean
  label?: string | JSX.Element
  helperText?: JSX.Element
  accept?: string
  multiple?: boolean
  onUpdate?: (files: FileInputResult[]) => void
  parentClass?: string
}> = (props) => {
  const onFile = async (list: FileList | null) => {
    if (!props.onUpdate) return
    if (!list) {
      return props.onUpdate([])
    }

    const files = await Promise.all(Array.from(list).map(getFileAsDataURL))
    props.onUpdate(files)
  }

  return (
    <div class={`w-full ${props.parentClass || ''}`}>
      <FormLabel label={props.label} helperText={props.helperText} />
      <input
        ref={(ref) => {
          props.ref?.(ref)
        }}
        id={props.fieldName}
        name={props.fieldName}
        type="file"
        accept={props.accept}
        class={`w-full rounded-xl bg-[var(--bg-800)] ${props.class || ''} cursor-pointer`}
        onChange={(ev) => onFile(ev.currentTarget.files)}
        {...(props.multiple ? { multiple: true } : {})}
        {...(props.required ? { required: true } : {})}
      />
    </div>
  )
}

export async function getFileAsString(result: FileInputResult) {
  const buffer = await result.file.arrayBuffer().then((b) => Buffer.from(b))
  return buffer.toString()
}

export function getFileAsDataURL(file: File): Promise<FileInputResult> {
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

export function getFileAsBuffer(file: File): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      if (!ev.target?.result) return reject(new Error(`Failed to process file`))
      resolve(Buffer.from(ev.target.result as ArrayBuffer))
    }

    reader.readAsArrayBuffer(file)
  })
}

export default FileInput
