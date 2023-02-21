import { Component, JSX } from 'solid-js'

type ButtonSchema = 'primary' | 'secondary'

const schemaNameToClass: Record<ButtonSchema, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
}

const Button: Component<{
  children: JSX.Element
  onClick?: JSX.EventHandler<HTMLButtonElement, MouseEvent>
  schema?: ButtonSchema
  type?: 'submit' | 'reset' | 'button'
  disabled?: boolean
}> = (props) => (
  <button
    type={props.type || 'button'}
    class={`${schemaNameToClass[props.schema || 'primary']} justify-center`}
    disabled={props.disabled}
    onClick={props.onClick}
  >
    {props.children}
  </button>
)

export default Button
