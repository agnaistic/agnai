import { A, useNavigate } from '@solidjs/router'
import { Edit, Plus, Trash } from 'lucide-solid'
import { Component, createEffect, createSignal, For, Show } from 'solid-js'
import Button from '../../shared/Button'
import { ConfirmModal } from '../../shared/Modal'
import PageHeader from '../../shared/PageHeader'
import { presetStore } from '../../store/presets'

const PresetList: Component = () => {
  const nav = useNavigate()
  const state = presetStore()
  const [deleting, setDeleting] = createSignal<string>()

  createEffect(() => {
    presetStore.getPresets()
  })

  const deletePreset = () => {
    const presetId = deleting()
    if (!presetId) return

    presetStore.deletePreset(presetId, () => nav('/presets'))
    setDeleting()
  }

  return (
    <>
      <PageHeader title="Generation Presets" subtitle="Your personal generation presets" />
      <div class="mb-4 flex w-full justify-end">
        <A href="/presets/new">
          <Button>
            <Plus />
            New Preset
          </Button>
        </A>
      </div>
      <Show when={!state.presets.length}>
        <div class="flex w-full justify-center">
          You have no personalised presets saved. Create a{' '}
          <Button class="mx-2" size="sm" onClick={() => nav('/presets/new')}>
            New Preset
          </Button>
          to get started.
        </div>
      </Show>

      <div class="flex flex-col items-center gap-2">
        <For each={state.presets}>
          {(preset) => (
            <div class="flex w-1/2 items-center gap-2">
              <A
                href={`/presets/${preset._id}`}
                class="flex h-12 w-full gap-4 rounded-xl bg-[var(--bg-800)] hover:bg-[var(--bg-600)]"
              >
                <div class="ml-4 flex w-full items-center">{preset.name}</div>
              </A>
              <Button
                schema="clear"
                size="sm"
                onClick={() => setDeleting(preset._id)}
                class="icon-button"
              >
                <Trash />
              </Button>
            </div>
          )}
        </For>
      </div>

      <ConfirmModal
        show={!!deleting()}
        close={() => setDeleting()}
        confirm={deletePreset}
        message="Are you sure you wish to delete this preset?"
      />
    </>
  )
}

export default PresetList
