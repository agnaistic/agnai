import { Component, Show, createMemo, JSX, onMount } from 'solid-js'

const TextInput: Component<{
  fieldName: string
  label?: string
  helperText?: string | JSX.Element
  placeholder?: string
  isMultiline?: boolean
  type?: string
  disabled?: boolean
  value?: number | string
  required?: boolean
  class?: string
  pattern?: string
  onKeyUp?: (key: string) => void
  onChange?: (ev: Event & { target: Element; currentTarget: HTMLInputElement }) => void
}> = (props) => {
  let ref: any
  const placeholder = createMemo(() => (props.placeholder !== undefined ? props.placeholder : ''))

  const value = createMemo(() =>
    props.value !== undefined ? props.value : (null as unknown as undefined)
  )

  onMount(() => {
    if (!ref) return

    ref.style.height = ''
    ref.style.height = `${ref.scrollHeight}px`
  })

  return (
    <div class="w-full">
      <Show when={!!props.label}>
        <label for={props.fieldName}>
          <div class={props.helperText ? '' : 'pb-1'}>{props.label}</div>
          <Show when={!!props.helperText}>
            <p class="mt-[-0.125rem] pb-1 text-sm text-[var(--text-700)]">{props.helperText}</p>
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
            class={'form-field focusable-field w-full rounded-xl px-4 py-2 ' + props.class}
            onkeyup={(ev) => props.onKeyUp?.(ev.key)}
            onchange={(ev) => props.onChange?.(ev)}
            disabled={props.disabled}
            pattern={props.pattern}
          />
        }
      >
        <textarea
          id={props.fieldName}
          name={props.fieldName}
          ref={ref}
          required={props.required}
          placeholder={placeholder()}
          value={value()}
          class={'form-field focusable-field text-900 w-full rounded-xl px-4 py-2 ' + props.class}
          disabled={props.disabled}
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
