import { Component, createSignal } from 'solid-js'
import TextInput from '/web/shared/TextInput'
import { Send } from 'lucide-solid'
import { userStore } from '/web/store'

export const AdventureInput: Component<{
  text?: (value: string) => void
  onEnter: (prompt: string, onSuccess: () => void) => void
  loading: boolean
}> = (props) => {
  let ref: HTMLTextAreaElement

  const user = userStore()
  const [text, setText] = createSignal('')

  const success = () => {
    setText('')
    ref.focus()
  }

  const updateText = () => {
    setText(ref.value)
    props.text?.(ref.value)
  }

  return (
    <div class="flex w-full items-end gap-1">
      <TextInput
        ref={(ele) => (ref = ele)}
        fieldName="message"
        isMultiline
        spellcheck
        parentClass="w-full"
        class="input-bar min-h-[80px] w-full py-0"
        value={text()}
        onInput={updateText}
        onKeyDown={(ev) => {
          const isMobileDevice = /Mobi/i.test(window.navigator.userAgent)
          const canMobileSend = isMobileDevice ? user.ui.mobileSendOnEnter : true
          if (ev.key === 'Enter' && !ev.shiftKey && canMobileSend) {
            props.onEnter(text(), success)
            ev.preventDefault()
          }
        }}
      />
      <Send
        class="icon-button pb-1"
        color={props.loading ? 'var(--bg-500)' : 'var(--bg-100)'}
        onClick={() => props.onEnter(text(), success)}
      />
    </div>
  )
}
