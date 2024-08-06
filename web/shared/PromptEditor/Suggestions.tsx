import { Component, Show, createMemo } from 'solid-js'
import { AutoComplete } from '../AutoComplete'

export const PromptSuggestions: Component<{
  jsonValues: any
  onComplete: (opt: { label: string }) => void
  open: boolean
  close: () => void
}> = (props) => {
  const options = createMemo(() => {
    const keys = Object.keys(props.jsonValues)

    return keys.map((key) => ({ label: key, value: key }))
  })

  return (
    <Show when={props.open}>
      <AutoComplete
        options={options()}
        dir="down"
        close={props.close}
        onSelect={props.onComplete}
      />
    </Show>
  )
}

export function onPromptKey(ev: AutoEvent, open: () => void) {
  if (ev.key !== '.') return

  const before = ev.currentTarget.value.slice(0, ev.currentTarget.selectionStart)
  if (before.endsWith('json')) {
    open()
  }
}

export function onPromptAutoComplete(ref: HTMLTextAreaElement, opt: { label: string }) {
  let prev = ref.value
  let before = prev.slice(0, ref.selectionStart - 1)
  let after = prev.slice(ref.selectionStart)

  if (!after.startsWith('}')) {
    after = '}}' + after
  }
  const next = `${before}.${opt.label}${after}`
  ref.value = next
  ref.focus()
  ref.setSelectionRange(before.length + opt.label.length, before.length + opt.label.length, 'none')
}

export type AutoEvent = KeyboardEvent & { target: any; currentTarget: HTMLTextAreaElement }
