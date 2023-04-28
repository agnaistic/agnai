import { Component, JSX, For, createMemo } from 'solid-js'
import { AppSchema } from '../../srv/db/schema'
import { characterStore } from '../store'
import { toMap } from './util'
import Select from './Select'

export type Option<T extends string = string> = {
  label: string
  value: T
}

const CharacterSelect: Component<{
  fieldName: string
  label?: string
  helperText?: string | JSX.Element
  items: AppSchema.Character[]
  emptyLabel?: string
  value?: AppSchema.Character
  class?: string
  disabled?: boolean
  onChange?: (item: AppSchema.Character | undefined) => void
}> = (props) => {
  const emptyOption = props.emptyLabel ? [{ label: props.emptyLabel, value: '' }] : []
  const chars = characterStore((s) => ({
    map: toMap(s.characters.list),
    list: s.characters.list,
    loaded: s.characters.loaded,
  }))

  const onChange = (charId: string) => {
    if (!props.onChange) return
    const item = props.items.find((item) => item._id === charId)
    props.onChange(item)
  }

  const charItems = createMemo(() => {
    return emptyOption.concat(
      chars.list
        .slice()
        .sort((l, r) => (l.name > r.name ? 1 : l.name === r.name ? 0 : -1))
        .map((ch) => ({ label: ch.name, value: ch._id }))
    )
  })

  return (
    <Select
      fieldName="char"
      items={charItems()}
      value={props.value?._id ?? ''}
      onChange={(o) => onChange(o.value)}
      {...(props.disabled ? { disabled: true } : {})}
      class={props.class}
    />
  )
}

export default CharacterSelect
