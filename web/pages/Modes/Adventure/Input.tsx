import { Component, createSignal } from 'solid-js'
import TextInput from '/web/shared/TextInput'
import { Send } from 'lucide-solid'

export const AdventureInput: Component<{
  text?: (value: string) => void
  onEnter: (prompt: string) => void
}> = (props) => {
  let ref: any

  const [text, setText] = createSignal('')

  const updateText = () => {
    setText(ref.value)
    props.text?.(ref.value)
  }

  return (
    <div class="flex w-full items-end gap-1">
      <TextInput
        ref={ref}
        fieldName="message"
        isMultiline
        spellcheck
        parentClass="w-full"
        class="input-bar min-h-[80px] w-full py-0"
        value={text()}
        onInput={updateText}
      />
      <Send class="pb-1" color="var(--bg-500)" onClick={() => props.onEnter(text())} />
    </div>
  )
}
