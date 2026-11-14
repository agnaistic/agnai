import { Component, createMemo, createSignal } from 'solid-js'
import { ImageContext } from './image-context'
import { CustomSelect } from 'web/shared/CustomSelect'
import TextInput from 'web/shared/TextInput'
import { RefreshCcw } from 'lucide-solid'

export const ImageModel: Component<{
  ctx: ImageContext
  prefix?: string
  onSelect?: (modelId: string) => void
}> = (props) => {
  const [search, setSearch] = createSignal('')

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

  const selected = createMemo(() => {
    const list = props.ctx.models() || []
    const match = list.find((l) => l.value === modelId())

    if (!match) {
      return { label: 'None', value: '' }
    }
    return match
  })

  const options = createMemo(() => {
    const list = props.ctx.models() || []
    const opts = [{ label: 'None selected', value: '' }].concat(list)

    const filter = search()
    if (!filter.trim()) return opts

    const split = filter.split(' ').map((w) => w.trim().toLowerCase())

    const filtered = opts.filter((opt) => {
      if (!opt.value) return opt

      for (const word of split) {
        if (!opt.value.includes(word)) return false
      }

      return true
    })

    return filtered
  })

  return (
    <CustomSelect
      size="sm"
      options={options()}
      onSelect={(opt) => selectModel(opt.value)}
      selected={selected()}
      buttonLabel={(opt) => `${props.prefix ? props.prefix + ': ' : ''}${opt.label || 'Unknown'}`}
      onOpen={() => props.ctx.refetchModels()}
      header={
        <div class="flex items-center gap-2">
          <TextInput
            value={search()}
            placeholder="Filter..."
            onChange={(ev) => setSearch(ev.currentTarget.value)}
            parentClass="text-sm w-full"
          />
          <div class="icon-button" onClick={() => props.ctx.refetchModels()}>
            <RefreshCcw size={20} />
          </div>
        </div>
      }
    />
  )
}
