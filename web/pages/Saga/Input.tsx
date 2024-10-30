import { Component } from 'solid-js'
import TextInput from '/web/shared/TextInput'
import { userStore } from '/web/store'

export const SagaInput: Component<{
  text?: (value: string) => void
  onEnter: (prompt: string, onSuccess: () => void) => void
  loading: boolean
  input?: (ele: HTMLTextAreaElement) => void
}> = (props) => {
  let ref: HTMLTextAreaElement

  const user = userStore()

  const success = () => {
    ref.value = ''
    ref.focus()
  }

  const updateText = () => {
    props.text?.(ref.value)
  }

  return (
    <div class="flex w-full items-end gap-1">
      <TextInput
        ref={(ele) => {
          ref = ele
          props.input?.(ref)
        }}
        fieldName="message"
        isMultiline
        spellcheck
        parentClass="w-full"
        class="input-bar min-h-[80px] w-full py-0"
        onChange={updateText}
        disabled={props.loading}
        onKeyDown={(ev) => {
          const isMobileDevice = /Mobi/i.test(window.navigator.userAgent)
          const canMobileSend = isMobileDevice ? user.ui.mobileSendOnEnter : true
          if (ev.key === 'Enter' && !ev.shiftKey && canMobileSend) {
            props.onEnter(ref.value, success)
            ev.preventDefault()
          }
        }}
      />
      {/* <Send
        class="icon-button pb-1"
        color={props.loading ? 'var(--bg-500)' : 'var(--bg-100)'}
        onClick={() => props.onEnter(ref.value, success)}
      /> */}
    </div>
  )
}
