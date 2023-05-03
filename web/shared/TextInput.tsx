import { Component, Show, createMemo, JSX, onMount, createEffect } from 'solid-js'
import IsVisible from './IsVisible'
import { AIAdapter } from '../../common/adapters'

const MIN_HEIGHT = 40

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
  onKeyUp?: (
    ev: KeyboardEvent & { target: Element; currentTarget: HTMLInputElement | HTMLTextAreaElement }
  ) => void
  onChange?: (ev: Event & { target: Element; currentTarget: HTMLInputElement }) => void

  service?: AIAdapter
  adapters?: AIAdapter[] | readonly AIAdapter[]
}> = (props) => {
  let ref: any
  const placeholder = createMemo(() => (props.placeholder !== undefined ? props.placeholder : ''))

  const value = createMemo(() =>
    props.value !== undefined ? props.value : (null as unknown as undefined)
  )

  const resize = () => {
    if (!ref) return

    const next = +ref.scrollHeight < MIN_HEIGHT ? MIN_HEIGHT : ref.scrollHeight
    ref.style.height = `${next}px`
  }

  const hide = createMemo(() => {
    if (!props.service || !props.adapters) return ''
    return props.adapters.includes(props.service) ? '' : ` hidden `
  })

  onMount(resize)

  return (
    <div class={`w-full ${hide()}`}>
      <Show when={!!props.label}>
        <label for={props.fieldName}>
          <div class={props.helperText ? '' : 'pb-1'}>
            {props.label}
            <Show when={props.isMultiline}>
              <IsVisible onEnter={resize} />
            </Show>
          </div>
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
            onkeyup={(ev) => props.onKeyUp?.(ev)}
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
          class={
            'form-field focusable-field text-900 min-h-[32px] w-full rounded-xl px-4 py-2 ' +
            props.class
          }
          disabled={props.disabled}
          onKeyUp={(ev) => props.onKeyUp?.(ev)}
          onInput={resize}
        />
      </Show>
    </div>
  )
}

export default TextInput
