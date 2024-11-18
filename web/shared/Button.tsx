import { Component, JSX, Show, createMemo, createSignal } from 'solid-js'

export type ButtonSchema = keyof typeof kinds

const kinds = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  grey: 'btn-secondary',
  gray: 'btn-secondary',
  clear: 'btn-clear',
  red: 'btn-red',
  error: 'btn-red',
  success: 'btn-green',
  green: 'btn-green',
  warning: 'btn-orange',
  hollow: 'btn-hollow',
  bordered: 'btn-bordered',
  icon: 'btn-icon',
  input: 'btn-input',
  none: '',
} satisfies { [key: string]: string }

const sizes = {
  sm: 'py-1 text-sm',
  md: 'py-2',
  lg: 'py-4 text-lg',
  xs: 'py-0.5 text-xs',
}

const Button: Component<{
  children: JSX.Element
  onClick?: JSX.EventHandler<HTMLButtonElement, MouseEvent>
  schema?: ButtonSchema
  type?: 'submit' | 'reset' | 'button'
  size?: 'sm' | 'md' | 'lg' | 'pill'
  disabled?: boolean
  class?: string
  alignLeft?: boolean
  classList?: { [key: string]: boolean }
  ariaLabel?: string
}> = (props) => {
  const schema = createMemo(() => kinds[props.schema || 'primary'])
  return (
    <button
      type={props.type || 'button'}
      class={`select-none items-center ${props.class || ''}`}
      classList={{
        ...props.classList,
        [schema()]: true,
        'leading-5': props.size === 'pill',
        'py-0': props.size === 'pill',
        'py-1': props.size === 'sm',
        'py-2': !props.size || props.size === 'md',
        'py-4': props.size === 'lg',
        'text-sm': props.size === 'sm' || props.size === 'pill',
        'text-lg': props.size === 'lg',
        'justify-center': !props.alignLeft,
      }}
      disabled={props.disabled}
      onClick={props.onClick}
      aria-label={props.ariaLabel}
    >
      {props.children}
    </button>
  )
}

export const LabelButton: Component<{
  children: JSX.Element
  for: string
  onClick?: JSX.EventHandler<HTMLLabelElement, MouseEvent>
  schema?: ButtonSchema
  type?: 'submit' | 'reset' | 'button'
  size?: 'sm' | 'md' | 'lg' | 'pill'
  disabled?: boolean
  class?: string
  alignLeft?: boolean
  classList?: { [key: string]: boolean }
}> = (props) => (
  <label
    for={props.for}
    class={`select-none items-center` + (props.class || '')}
    classList={{
      ...props.classList,
      [kinds[props.schema || 'primary']]: true,
      'leading-5': props.size === 'pill',
      'py-0': props.size === 'pill',
      'py-1': props.size === 'sm',
      'py-2': !props.size || props.size === 'md',
      'py-4': props.size === 'lg',
      'text-sm': props.size === 'sm' || props.size === 'pill',
      'text-lg': props.size === 'lg',
      'justify-center': !props.alignLeft,
    }}
    onClick={props.onClick}
  >
    {props.children}
  </label>
)

export const ModeButton: Component<{
  fieldName: string
  onChange?: (value: string) => void
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  value?: string
  class?: string
  alignLeft?: boolean
  labels?: string[]
  modes: string[]
}> = (props) => {
  let ref: HTMLInputElement

  const [mode, setMode] = createSignal(props.value || props.modes[0])

  const label = createMemo(() => {
    const id = mode()
    if (!props.labels) return id
    const index = props.modes.indexOf(id)

    if (index === -1) id
    return props.labels[index] ?? id
  })

  const onClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (ev) => {
    let index = props.modes.indexOf(mode()) + 1
    if (index >= props.modes.length) {
      index = 0
    }
    const value = props.modes[index]
    setMode(value)
    ref.value = value
    props.onChange?.(value)
  }

  return (
    <>
      <button
        type="button"
        class={
          `${kinds.primary} select-none items-center ${props.alignLeft ? '' : 'justify-center'} ${
            sizes[props.size || 'md']
          } ` + (props.class || '')
        }
        disabled={props.disabled}
        onClick={onClick}
      >
        {label()}
      </button>
      <input ref={ref!} name={props.fieldName} type="text" class="hidden" value={props.value} />
    </>
  )
}

export const ToggleButton: Component<{
  fieldName?: string
  children: JSX.Element
  onChange: (value: boolean) => void
  size?: 'sm' | 'md' | 'lg' | 'xs'
  disabled?: boolean
  value?: boolean
  class?: string
  alignLeft?: boolean
  onText?: string
  offText?: string
}> = (props) => {
  const onClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (_ev) => {
    props.onChange(!props.value)
  }

  return (
    <>
      <button
        type="button"
        class={
          `box-border select-none items-center ${props.alignLeft ? '' : 'justify-center'} ${
            sizes[props.size || 'md']
          } ` + (props.class || '')
        }
        classList={{
          [kinds.hollow]: !props.value,
          [kinds.success]: props.value,
          'border-[1px]': !props.value,
          'border-solid': !props.value,
          'border-[var(--hl-500)]': !props.value,
        }}
        disabled={props.disabled}
        onClick={onClick}
      >
        {props.children} <Show when={props.value && props.onText}>{props.onText}</Show>
        <Show when={!props.value && props.offText}>{props.offText}</Show>
      </button>
    </>
  )
}

export default Button
