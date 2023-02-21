import { Component, JSX } from 'solid-js'

type ButtonSchema = keyof typeof kinds

const kinds = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  clear: 'btn-clear',
} satisfies { [key: string]: string }

const Button: Component<{
  children: JSX.Element
  onClick?: JSX.EventHandler<HTMLButtonElement, MouseEvent>
  schema?: ButtonSchema
  type?: 'submit' | 'reset' | 'button'
  disabled?: boolean
}> = (props) => (
  <button
    type={props.type || 'button'}
    class={`${kinds[props.schema || 'primary']} justify-center`}
    disabled={props.disabled}
    onClick={props.onClick}
  >
    {props.children}
  </button>
)

export default Button
