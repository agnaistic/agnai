import { Component, createSignal, JSX, Show } from 'solid-js'
import { FormLabel } from './FormLabel'
import Button, { ButtonSchema } from './Button'

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
  size?: 'sm' | 'md' | 'lg' | 'pill'
  schema?: ButtonSchema
  children?: JSX.Element | string
  disabled?: boolean
}> = (props) => {
  let inputRef: HTMLInputElement
  const [selected, setSelected] = createSignal<FileInputResult[]>([])

  const onFile = async (list: FileList | null) => {
    try {
      if (!props.onUpdate) return
      if (!list) {
        setSelected([])
        return props.onUpdate([])
      }

      const files = await Promise.all(Array.from(list).map(getFileAsDataURL))
      setSelected(files)
      props.onUpdate(files)
    } finally {
      inputRef.value = ''
    }
  }

  return (
    <div class={`w-full ${props.parentClass || ''}`}>
      <FormLabel label={props.label} helperText={props.helperText} />
      <Button onClick={() => inputRef.click()} size={props.size} schema={props.schema}>
        <Show
          when={selected().length === 0}
          fallback={
            <>
              Selected:{' '}
              {selected().length === 1
                ? `${selected()[0].file.name}`
                : `${selected().length} files`}
            </>
          }
        >
          <Show when={props.children} fallback={<>Select File{props.multiple ? '(s)' : ''}</>}>
            {props.children}
          </Show>
        </Show>
      </Button>
      <input
        ref={(ref) => {
          inputRef = ref
          props.ref?.(ref)
        }}
        id={props.fieldName}
        name={props.fieldName}
        type="file"
        accept={props.accept}
        class={`hidden`}
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
