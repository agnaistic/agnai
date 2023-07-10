import { Component, JSX, createSignal } from 'solid-js'

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
} satisfies { [key: string]: string }

const sizes = {
  sm: 'py-1 text-sm',
  md: 'py-2',
  lg: 'py-4 text-lg',
}

const Button: Component<{
  children: JSX.Element
  onClick?: JSX.EventHandler<HTMLButtonElement, MouseEvent>
  schema?: ButtonSchema
  type?: 'submit' | 'reset' | 'button'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  class?: string
  alignLeft?: boolean
  classList?: { [key: string]: boolean }
}> = (props) => (
  <button
    type={props.type || 'button'}
    class={
      `${kinds[props.schema || 'primary']} select-none items-center ${
        props.alignLeft ? '' : 'justify-center'
      } ${sizes[props.size || 'md']} ` + (props.class || '')
    }
    classList={props.classList}
    disabled={props.disabled}
    onClick={props.onClick}
  >
    {props.children}
  </button>
)

export const ToggleButton: Component<{
  fieldName: string
  children: JSX.Element
  onChange?: (value: boolean) => void
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  value?: boolean
  class?: string
  alignLeft?: boolean
}> = (props) => {
  let ref: HTMLInputElement

  const [val, setVal] = createSignal(props.value ?? false)

  const onClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (ev) => {
    const value = !ref.checked
    ref.checked = value
    setVal(value)
    props.onChange?.(value)
  }

  return (
    <>
      <button
        type="button"
        class={
          `${kinds.hollow} select-none items-center ${props.alignLeft ? '' : 'justify-center'} ${
            sizes[props.size || 'md']
          } ` + (props.class || '')
        }
        classList={{
          [kinds.hollow]: !val(),
          [kinds.success]: val(),
        }}
        disabled={props.disabled}
        onClick={onClick}
      >
        {props.children}
      </button>
      <input
        ref={ref!}
        name={props.fieldName}
        type="checkbox"
        class="hidden"
        checked={props.value}
      />
    </>
  )
}

export default Button
