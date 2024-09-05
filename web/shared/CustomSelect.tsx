import { Component, JSX } from 'solid-js'

export type CustomOption = {
  label: string | JSX.Element
  value: any
}

export const CustomSelect: Component<{
  label?: string
  helperText?: string
  fieldName?: string
  options: CustomOption[]
  selected?: any
  onSelect: (opt: CustomOption) => void
}> = (props) => {
  return null
}
