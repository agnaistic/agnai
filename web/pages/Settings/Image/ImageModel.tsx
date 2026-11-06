import { Component, createMemo } from 'solid-js'
import { ImageContext } from './image-context'
import { CustomSelect } from 'web/shared/CustomSelect'

export const ImageModel: Component<{ ctx: ImageContext }> = (props) => {
  const selectModel = (id: string) => {
    props.ctx.changeModel(id)
  }

  const selected = createMemo(() => {
    const list = props.ctx.models() || []
    const match = list.find((l) => l.value === props.ctx.current.provider.model)

    if (!match) {
      return { label: 'None', value: '' }
    }
    return match
  })

  const options = createMemo(() => {
    const list = props.ctx.models() || []
    return [{ label: 'None selected', value: '' }].concat(list)
  })

  return (
    <CustomSelect
      size="sm"
      options={options()}
      onSelect={(opt) => selectModel(opt.value)}
      selected={selected()}
      buttonLabel={(opt) => `Model: ${opt.label || 'Unknown'}`}
    />
  )
}
