import { PlusSquare } from 'lucide-solid'
import { Component, createEffect } from 'solid-js'
import Button from '../../shared/Button'
import Dropdown, { DropdownItem } from '../../shared/Dropdown'
import PageHeader from '../../shared/PageHeader'
import { presetStore } from '../../store/presets'

export const GenerationPresetsPage: Component = () => {
  const state = presetStore(({ presets }) => ({
    presets,
    items: presets.map<DropdownItem>((p) => ({ label: p.name, value: p._id })),
  }))

  createEffect(() => {
    presetStore.getPresets()
  })

  return (
    <>
      <PageHeader title="Generation Presets" />
      <div class="flex flex-col gap-2">
        <div class="flex flex-row justify-between">
          <div>
            <Dropdown fieldName="preset" items={state.items} />
          </div>
          <div>
            <Button>
              <PlusSquare />
              New Preset
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

export default GenerationPresetsPage
