import { Component, createMemo } from 'solid-js'
import { ImageContext } from './image-context'
import { CustomSelect } from '/web/shared/CustomSelect'
import { RefreshCcw } from 'lucide-solid'
import Button from '/web/shared/Button'

export const ImageModel: Component<{
  ctx: ImageContext
  prefix?: string
  onSelect?: (modelId: string) => void
}> = (props) => {
  const selectModel = (id: string) => {
    if (props.onSelect) {
      props.onSelect(id)
      return
    }

    props.ctx.changeModel(id)
  }

  const modelId = createMemo(() => {
    const providerId = props.ctx.current.provider._id
    const providerModel = props.ctx.current.preset.models?.[providerId]
    if (!providerModel) return props.ctx.current.provider.model

    return providerModel
  })

  const options = createMemo(() => {
    const list = props.ctx.models() || []
    const opts = [{ label: 'None selected', value: '' }]

    const model = props.ctx.current.preset.models?.[props.ctx.current.preset.imageProviderId]
    if (!list.length && model) {
      opts.push({ label: model, value: model })
    }

    return opts.concat(list)
  })

  const selected = createMemo(() => {
    const match = options().find((l) => l.value === modelId())

    if (!match) {
      return { label: 'None', value: '' }
    }
    return match
  })

  return (
    <CustomSelect
      size="sm"
      options={options()}
      onSelect={(opt) => selectModel(opt.value)}
      selected={selected()}
      buttonLabel={(opt) => `${props.prefix ? props.prefix + ': ' : ''}${opt.label || 'Unknown'}`}
      onOpen={() => props.ctx.refetchModels()}
      autoSearch
      header={
        <div class="flex items-center gap-2">
          {/* <TextInput
            value={search()}
            placeholder="Filter..."
            onChange={(ev) => setSearch(ev.currentTarget.value)}
            parentClass="text-sm w-full"
          /> */}
          <Button size="sm" onClick={() => props.ctx.refetchModels()}>
            Refresh <RefreshCcw size={12} />
          </Button>
        </div>
      }
    />
  )
}
