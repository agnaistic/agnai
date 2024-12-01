import {
  Component,
  Show,
  createMemo,
  JSX,
  createEffect,
  createSignal,
  Switch,
  Match,
  on,
} from 'solid-js'
import IsVisible from './IsVisible'
import { createDebounce } from './util'
import { getEncoder } from '/common/tokenize'
import { useEffect } from './hooks'
import { markdown } from './markdown'

const MIN_HEIGHT = 40

type Props = {
  fieldName?: string
  prelabel?: string
  label?: string | JSX.Element
  helperText?: string | JSX.Element
  helperMarkdown?: string
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
  step?: number
  readonly?: boolean
  classList?: Record<string, boolean>
  input?: JSX.InputHTMLAttributes<HTMLInputElement>
  textarea?: JSX.TextareaHTMLAttributes<HTMLTextAreaElement>
  children?: any
  initialValue?: number | string
  hide?: boolean
  variant?: 'outline'

  /** Do not update the input value if the value property receives a new value */
  static?: boolean
  ref?: (ref: any) => void

  onKeyUp?: (
    ev: KeyboardEvent & { target: Element; currentTarget: HTMLInputElement | HTMLTextAreaElement }
  ) => void

  onKeyDown?: (
    ev: KeyboardEvent & { target: Element; currentTarget: HTMLInputElement | HTMLTextAreaElement }
  ) => void

  onChange?: (
    ev: Event & { target: Element; currentTarget: HTMLInputElement | HTMLTextAreaElement }
  ) => void
}

export const ButtonInput: Component<Props & { children: any }> = (props) => {
  return (
    <TextInput {...props} parentClass={`${props.parentClass || ''} input-buttons w-full`}>
      {props.children}
    </TextInput>
  )
}

const TextInput: Component<Props> = (props) => {
  let inputRef: any

  const [tokens, setTokens] = createSignal(0)
  const [height, setHeight] = createSignal(MIN_HEIGHT + 'px')
  const placeholder = createMemo(() => (props.placeholder !== undefined ? props.placeholder : ''))

  const value = createMemo(() =>
    props.value !== undefined ? props.value : (null as unknown as undefined)
  )

  const [countTokens] = createDebounce(async (text: string) => {
    const tokenizer = await getEncoder()
    const count = await tokenizer(text)
    setTokens(count)

    if (typeof props.tokenCount === 'function') {
      props.tokenCount(count)
    }
  }, 500)

  const updateCount = async () => {
    if (!props.tokenCount) return
    countTokens(inputRef?.value || '')
  }

  useEffect(() => {
    const tick = setInterval(() => {
      resize()
    }, 1000)

    return () => clearInterval(tick)
  })

  const resize = () => {
    if (inputRef?.value === '') {
      setHeight(MIN_HEIGHT + 'px')
      return
    }

    updateCount()

    if (inputRef) {
      const next = +inputRef.scrollHeight < MIN_HEIGHT ? MIN_HEIGHT : inputRef.scrollHeight
      setHeight(next + 'px')
    }
  }

  createEffect(
    on(
      () => props.value,
      () => {
        if (props.value === undefined) return // Unsure about this
        if (props.static) return

        if (inputRef) {
          inputRef.value = props.value.toString()
        }

        resize()
        updateCount()
      }
    )
  )

  createEffect(() => {
    if (!inputRef) return
    if (props.isMultiline) {
      value()
      resize()
    }
  })

  const onRef = (ref: any) => {
    props.ref?.(ref)
    setTimeout(() => {
      inputRef = ref
      if (props.value !== undefined) {
        ref.value = props.value
      }
      resize()
    })
  }

  const handleInput = async (
    ev: Event & { target: Element; currentTarget: HTMLTextAreaElement | HTMLInputElement }
  ) => {
    resize()
    props.onChange?.(ev)

    // On the next tick: Evaluate if the props.value and input.value are inconsistent
    // If the component caller 'clamps' the value, the createEffect that monitors the props.value won't be called
    // Therefore we must also monitor it on-input
    setTimeout(() => {
      if (props.value === undefined || !inputRef) return
      if (!props.onChange) return
      if (props.value.toString().trim() !== inputRef.value.toString().trim()) {
        inputRef.value = props.value.toString()
      }
    })
  }

  return (
    <div
      class={`${props.parentClass || ''} box-border`}
      classList={{
        'flex gap-0': !!props.prelabel && !props.isMultiline,
        hidden: props.parentClass?.includes('hidden') || props.hide,
      }}
    >
      <Show when={props.prelabel && !props.isMultiline}>
        <div class="bg-600 flex items-center rounded-l-md px-2 text-center text-sm font-bold">
          {props.prelabel}
        </div>
      </Show>
      <Show when={!!props.label || !!props.helperText}>
        <label for={props.fieldName}>
          <Show when={!!props.label}>
            <div class="flex items-center gap-1" classList={{ 'pb-1': !props.helperText }}>
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
            <p class="helper-text">{props.helperText}</p>
          </Show>
          <Show when={!!props.helperMarkdown}>
            <p
              class="helper-text markdown"
              innerHTML={markdown.makeHtml(props.helperMarkdown!)}
            ></p>
          </Show>
        </label>
      </Show>
      <Switch>
        <Match when={props.isMultiline}>
          <textarea
            id={props.fieldName}
            name={props.fieldName}
            ref={onRef}
            required={props.required}
            readOnly={props.readonly}
            placeholder={placeholder()}
            aria-placeholder={placeholder()}
            value={props.initialValue ?? value()}
            class={
              'form-field focusable-field text-900 box-border min-h-[40px] w-full rounded-md px-4 hover:border-white/20 ' +
              (props.class || '')
            }
            style={{ transition: 'height 0.2s ease-in-out', height: height() }}
            classList={{
              'py-2': !props.class?.includes('py-'),
              'border-0.25': props.variant === 'outline',
              'border-[var(--bg-600)]': props.variant === 'outline',
              ...props.classList,
            }}
            disabled={props.disabled}
            spellcheck={props.spellcheck}
            lang={props.lang}
            onKeyUp={(ev) => props.onKeyUp?.(ev)}
            onKeyDown={(ev) => props.onKeyDown?.(ev)}
            onchange={handleInput}
            onInput={handleInput}
            {...props.textarea}
          />
        </Match>
        <Match when={!props.children}>
          <input
            id={props.fieldName}
            ref={onRef}
            name={props.fieldName}
            type={props.type || 'text'}
            required={props.required}
            readOnly={props.readonly}
            placeholder={placeholder()}
            aria-placeholder={placeholder()}
            value={props.initialValue ?? value()}
            class={
              'form-field focusable-field box-border rounded-md px-4 hover:border-white/20 ' +
              (props.class || '')
            }
            classList={{
              'w-full': !props.class?.includes('w-'),
              'border-[1px]': props.variant === 'outline',
              'border-[var(--bg-600)]': props.variant === 'outline',
              'py-2': !props.class?.includes('p-') && !props.class?.includes('py-'),
              'rounded-l-none': !!props.prelabel,
              ...props.classList,
            }}
            onkeyup={(ev) => {
              updateCount()
              props.onKeyUp?.(ev)
            }}
            onKeyDown={(ev) => props.onKeyDown?.(ev)}
            onChange={handleInput}
            onInput={handleInput}
            disabled={props.disabled}
            pattern={props.pattern}
            spellcheck={props.spellcheck}
            lang={props.lang}
            step={props.step}
            {...props.input}
          />
        </Match>
        <Match when>
          <div class="input-buttons w-full">
            <input
              id={props.fieldName}
              name={props.fieldName}
              type={props.type || 'text'}
              required={props.required}
              readOnly={props.readonly}
              placeholder={placeholder()}
              aria-placeholder={placeholder()}
              value={value()}
              class={'form-field focusable-field rounded-xl px-4 py-2 ' + (props.class || '')}
              classList={{
                'w-full': !props.class?.includes('w-'),
                'border-[1px]': props.variant === 'outline',
                'border-[var(--bg-600)]': props.variant === 'outline',
                ...props.classList,
              }}
              onkeyup={(ev) => {
                updateCount()
                props.onKeyUp?.(ev)
              }}
              onKeyDown={(ev) => props.onKeyDown?.(ev)}
              onChange={handleInput}
              onInput={handleInput}
              disabled={props.disabled}
              pattern={props.pattern}
              spellcheck={props.spellcheck}
              lang={props.lang}
              ref={onRef}
              step={props.step}
              {...props.input}
            />
            {props.children}
          </div>
        </Match>
      </Switch>
    </div>
  )
}

export default TextInput
