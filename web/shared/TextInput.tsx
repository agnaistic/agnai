import {
  Component,
  Show,
  createMemo,
  JSX,
  createEffect,
  createSignal,
  Switch,
  Match,
} from 'solid-js'
import IsVisible from './IsVisible'
import { AIAdapter, PresetAISettings, ThirdPartyFormat } from '../../common/adapters'
import { createDebounce, isValidServiceSetting } from './util'
import { getEncoder } from '/common/tokenize'
import { useEffect } from './hooks'
import { markdown } from './markdown'
import { forms } from '../emitter'

const MIN_HEIGHT = 40

type Props = {
  fieldName: string
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

  onInput?: (
    ev: Event & { target: Element; currentTarget: HTMLInputElement | HTMLTextAreaElement }
  ) => void

  onInputText?: (value: string) => void

  service?: AIAdapter
  format?: ThirdPartyFormat
  aiSetting?: keyof PresetAISettings
}

export const ButtonInput: Component<Props & { children: any }> = (props) => {
  return (
    <TextInput {...props} parentClass={`${props.parentClass || ''} input-buttons`}>
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

  createEffect(() => {
    if (props.value === undefined) return
    if (inputRef && inputRef.value !== props.value) inputRef.value = props.value.toString()
    resize()
    updateCount()
  })

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
      if (props.value) {
        ref.value = props.value
      }
      resize()
    })
  }

  const handleChange = async (
    ev: Event & { target: Element; currentTarget: HTMLTextAreaElement | HTMLInputElement }
  ) => {
    props.onChange?.(ev)
    forms.emit(props.fieldName, ev.currentTarget.value)
  }

  const handleInput = async (
    ev: Event & { target: Element; currentTarget: HTMLTextAreaElement | HTMLInputElement }
  ) => {
    resize()
    props.onInput?.(ev)
    props.onInputText?.(ev.currentTarget.value)
    forms.emit(props.fieldName, ev.currentTarget.value)
  }

  const hide = createMemo(() => {
    const isValid = isValidServiceSetting(props.service, props.format, props.aiSetting)
    return isValid ? '' : ' hidden'
  })

  return (
    <div class={`${hide()} ${props.parentClass || ''}`}>
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
            value={value()}
            class={
              'form-field focusable-field text-900 min-h-[40px] w-full rounded-xl px-4 ' +
              (props.class || '')
            }
            style={{ transition: 'height 0.2s ease-in-out', height: height() }}
            classList={{ 'py-2': !props.class?.includes('py-'), ...props.classList }}
            disabled={props.disabled}
            spellcheck={props.spellcheck}
            lang={props.lang}
            onKeyUp={(ev) => props.onKeyUp?.(ev)}
            onKeyDown={(ev) => props.onKeyDown?.(ev)}
            onchange={handleChange}
            onInput={handleInput}
            {...props.textarea}
          />
        </Match>
        <Match when={!props.children}>
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
              ...props.classList,
            }}
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
            ref={onRef}
            step={props.step}
            {...props.input}
          />
        </Match>
        <Match when>
          <div class="input-buttons">
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
                ...props.classList,
              }}
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
