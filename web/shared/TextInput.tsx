import { Component, Show, createMemo, JSX, onMount, createEffect, createSignal } from 'solid-js'
import IsVisible from './IsVisible'
import { AIAdapter, PresetAISettings } from '../../common/adapters'
import { getAISettingServices } from './util'
import { getEncoder } from '/common/tokenize'

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
  spellcheck?: boolean
  lang?: string
  parentClass?: string
  tokenCount?: boolean | ((count: number) => void)
  ref?: (ref: any) => void

  onKeyUp?: (ev: KeyboardEvent & { target: Element; currentTarget: HTMLInputElement | HTMLTextAreaElement }) => void

  onKeyDown?: (ev: KeyboardEvent & { target: Element; currentTarget: HTMLInputElement | HTMLTextAreaElement }) => void

  onChange?: (ev: Event & { target: Element; currentTarget: HTMLInputElement | HTMLTextAreaElement }) => void
  onInput?: (ev: Event & { target: Element; currentTarget: HTMLInputElement | HTMLTextAreaElement }) => void

  service?: AIAdapter
  aiSetting?: keyof PresetAISettings
}> = (props) => {
  let inputRef: any
  const [tokens, setTokens] = createSignal(0)
  const placeholder = createMemo(() => (props.placeholder !== undefined ? props.placeholder : ''))
  const adapters = createMemo(() => getAISettingServices(props.aiSetting))

  const value = createMemo(() => (props.value !== undefined ? props.value : (null as unknown as undefined)))

  createEffect(() => {
    if (props.value === undefined) return
    if (inputRef.value !== props.value) inputRef.value = props.value.toString()
    updateCount()
  })

  createEffect(() => {
    if (props.isMultiline) {
      value()
      resize()
    }
  })

  const handleChange = async (
    ev: Event & { target: Element; currentTarget: HTMLTextAreaElement | HTMLInputElement }
  ) => {
    props.onChange?.(ev)
  }

  const handleInput = async (
    ev: Event & { target: Element; currentTarget: HTMLTextAreaElement | HTMLInputElement }
  ) => {
    resize()
    props.onInput?.(ev)
  }

  const updateCount = async () => {
    if (!props.tokenCount) return
    const tokenizer = await getEncoder()
    const count = tokenizer(inputRef.value || '')
    setTokens(count)

    if (typeof props.tokenCount === 'function') {
      props.tokenCount(count)
    }
  }

  const resize = () => {
    if (!inputRef) return

    if (inputRef.value === '') {
      inputRef.style.height = `${MIN_HEIGHT}px`
      return
    }

    updateCount()
    const next = +inputRef.scrollHeight < MIN_HEIGHT ? MIN_HEIGHT : inputRef.scrollHeight
    inputRef.style.height = `${next}px`
  }

  const hide = createMemo(() => {
    if (!props.service || !adapters()) return ''
    return adapters()!.includes(props.service) ? '' : ` hidden `
  })

  onMount(() => {
    props.ref?.(inputRef)
  })

  return (
    <div class={`${hide()} ${props.parentClass || ''}`}>
      <Show when={!!props.label || !!props.helperText}>
        <label for={props.fieldName}>
          <Show when={!!props.label}>
            <div class={props.helperText ? '' : 'pb-1'}>
              {props.label}{' '}
              <Show when={props.tokenCount}>
                <em class="ml-1 text-xs">({tokens()} tokens)</em>
              </Show>
              <Show when={props.isMultiline}>
                <IsVisible onEnter={resize} />
              </Show>
            </div>
          </Show>
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
            onkeyup={(ev) => {
              updateCount()
              props.onKeyUp?.(ev)
            }}
            onKeyDown={(ev) => props.onKeyDown?.(ev)}
            onChange={handleChange}
            onInput={handleInput}
            disabled={props.disabled}
            pattern={props.pattern}
            spellcheck={props.spellcheck}
            lang={props.lang}
            ref={inputRef}
          />
        }
      >
        <textarea
          id={props.fieldName}
          name={props.fieldName}
          ref={inputRef}
          required={props.required}
          placeholder={placeholder()}
          value={value()}
          class={'form-field focusable-field text-900 min-h-[40px] w-full rounded-xl px-4 py-2 ' + props.class}
          disabled={props.disabled}
          spellcheck={props.spellcheck}
          lang={props.lang}
          onKeyUp={(ev) => props.onKeyUp?.(ev)}
          onKeyDown={(ev) => props.onKeyDown?.(ev)}
          onchange={handleChange}
          onInput={handleInput}
        />
      </Show>
    </div>
  )
}

export default TextInput
