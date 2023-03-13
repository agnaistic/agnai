import { Plus, Save } from 'lucide-solid'
import { Component, createEffect, createSignal, Show } from 'solid-js'
import { defaultPresets, presetValidator } from '../../../common/presets'
import { AppSchema } from '../../../srv/db/schema'
import Button from '../../shared/Button'
import Dropdown, { DropdownItem } from '../../shared/Dropdown'
import GenerationSettings from '../../shared/GenerationSettings'
import PageHeader from '../../shared/PageHeader'
import TextInput from '../../shared/TextInput'
import { getStrictForm } from '../../shared/util'
import { presetStore } from '../../store/presets'

export const GenerationPresetsPage: Component = () => {
  let ref: any

  let state = presetStore(({ presets, saving }) => ({
    saving,
    presets,
    items: presets.map<DropdownItem>((p) => ({ label: p.name, value: p._id })),
  }))

  createEffect(() => {
    presetStore.getPresets()
  })

  const onSelect = (item: DropdownItem) => {
    const preset = state.presets.find((pre) => pre._id === item.value)
    setSelected(preset)
  }

  const editPreset = () => {
    if (selected()) {
      setPreset(selected())
      return
    }

    if (state.items.length) {
      onSelect(state.items[0])
      editPreset()
    }
  }

  const startNew = () => {
    setPreset((_) => ({ _id: '', ...emptyPreset, kind: 'gen-setting', userId: '' }))
  }

  const deletePreset = () => {
    const preset = selected()
    if (preset) {
      setPreset(preset)
      startNew()
      presetStore.deletePreset(preset._id)
      window.location.reload()
      return
    }

    if (state.items.length) {
      onSelect(state.items[0])
      deletePreset()
    }
  }

  const [preset, setPreset] = createSignal<AppSchema.UserGenPreset>()
  const [selected, setSelected] = createSignal<AppSchema.UserGenPreset>()



  const onSave = (ev: Event) => {
    ev.preventDefault()
    if (state.saving) return
    const body = getStrictForm(ref, presetValidator)

    const prev = preset()
    if (prev?._id) {
      presetStore.updatePreset(prev._id, body)
    } else {
      presetStore.createPreset(body, (newPreset) => {
        setPreset(newPreset)
      })
    }
  }

  return (
    <>
      <PageHeader title="Generation Presets" subtitle="Your personal generation presets" />
      <div class="flex flex-col gap-2">
        <div class="flex flex-row justify-between">
          <div class="flex items-center gap-4">
            <Show when={state.presets.length}>
              <Dropdown fieldName="preset" items={state.items} onChange={onSelect} />
              <Button onClick={editPreset}>Edit Preset</Button>
              <Button schema="red" onClick={deletePreset}>Delete Preset</Button>
            </Show>
          </div>
          <div>
            <Button onClick={startNew}>
              <Plus />
              New Preset
            </Button>
          </div>
        </div>
        <div class="flex flex-col gap-4 p-2">
          <Show when={!state.presets.length && !preset()}>
            <div class="flex w-full justify-center">
              You have no personalised presets saved. Click New Preset to get started.
            </div>
          </Show>
          <Show when={preset()}>
            <form ref={ref} onSubmit={onSave}>
              <div class="flex flex-col gap-4">
                <TextInput
                  fieldName="id"
                  label="Id"
                  value={preset()?._id || 'New Preset'}
                  disabled
                />
                <TextInput
                  fieldName="name"
                  label="Name"
                  helperText="A name or short description of your preset"
                  placeholder="E.g. Pygmalion Creative"
                  value={preset()?.name}
                  required
                />
                <GenerationSettings inherit={preset()} />
              </div>
              <div class="flex flex-row justify-end">
                <Button type="submit" disabled={state.saving}>
                  <Save /> Save
                </Button>
              </div>
            </form>
          </Show>
        </div>
      </div>
    </>
  )
}

export default GenerationPresetsPage

export const emptyPreset: AppSchema.GenSettings = {
  ...defaultPresets.basic,
  name: '',
  maxTokens: 80,
}
