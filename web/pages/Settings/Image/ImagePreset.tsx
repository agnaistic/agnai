import { Component, createMemo } from 'solid-js'
import { ImageContext } from './image-context'
import { ImagePresetSettings, ImageProviderSettings } from 'common/types/image-schema'
import { userStore } from 'web/store'
import { CustomOption, CustomSelect } from 'web/shared/CustomSelect'

type ImagePreset = {
  _id: string
  providerId: string

  provider: { [id: string]: ImageProviderSettings }
  samplers: Omit<ImagePresetSettings, '_id' | 'name'>
}

export const ImagePreset: Component<{ ctx: ImageContext; prefix?: string }> = (props) => {
  const state = userStore((u) => ({ presets: u.user?.imagePresets || [] }))

  const options = createMemo(() => {
    const list = state.presets.map((p) => ({
      label: `${p.name || 'Unnamed'}`,
      value: p._id,
    }))
    return [{ label: 'None', value: '' }].concat(list)
  })

  const selected = createMemo(() => {
    return state.presets.find((p) => p._id === props.ctx.current.preset._id)
  })

  const onSelect = async (opt: CustomOption) => {
    await props.ctx.changeImagePreset(opt.value)
  }

  return (
    <>
      <CustomSelect
        size="sm"
        options={options()}
        selected={props.ctx.current.preset._id}
        onSelect={onSelect}
        buttonLabel={(opt) =>
          `${props.prefix ? props.prefix + ': ' : ''}${selected()?.name || 'Unnamed'}`
        }
      />
    </>
  )
}
