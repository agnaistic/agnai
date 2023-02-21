import { Component, Show, createMemo, JSX } from 'solid-js'

const TextInput: Component<{
  fieldName: string
  label?: string
  helperText?: string | JSX.Element
  placeholder?: string
  isMultiline?: boolean
  type?: string
  value?: number | string
  required?: boolean
  class?: string
  onKeyUp?: (key: string) => void
  onChange?: (ev: Event & { target: Element; currentTarget: HTMLInputElement }) => void
}> = (props) => {
  const placeholder = createMemo(() => (props.placeholder !== undefined ? props.placeholder : ''))

  const value = createMemo(() =>
    props.value !== undefined ? props.value : (null as unknown as undefined)
  )

  return (
    <div>
      <Show when={!!props.label}>
        <label for={props.fieldName}>
          <div class={props.helperText ? '' : 'pb-1'}>{props.label}</div>
          <Show when={!!props.helperText}>
            <p class="mt-[-0.125rem] pb-1 text-sm text-white/50">{props.helperText}</p>
          </Show>
        </label>
      </Show>
      <Show
        when={props.isMultiline}
        fallback={
          <input
            id={props.fieldName}
            name={props.fieldName}
            type={props.type || 'text'}
            required={props.required}
            placeholder={placeholder()}
            value={value()}
            class={'focusable-field w-full rounded-xl px-4 py-2 ' + props.class}
            onkeyup={(ev) => props.onKeyUp?.(ev.key)}
            onchange={(ev) => props.onChange?.(ev)}
          />
        }
      >
        <textarea
          id={props.fieldName}
          name={props.fieldName}
          required={props.required}
          placeholder={placeholder()}
          value={value()}
          class={'focusable-field w-full rounded-xl px-4 py-2 !text-white ' + props.class}
          onInput={(e) => {
            const ele = e.target as HTMLTextAreaElement
            ele.style.height = ''
            ele.style.height = `${ele.scrollHeight}px`
          }}
        />
      </Show>
    </div>
  )
}

export default TextInput
