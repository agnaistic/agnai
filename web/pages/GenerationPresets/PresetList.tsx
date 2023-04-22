import { A, useNavigate } from '@solidjs/router'
import { Copy, Plus, Trash } from 'lucide-solid'
import { Component, createSignal, For, onMount } from 'solid-js'
import Button from '../../shared/Button'
import { ConfirmModal } from '../../shared/Modal'
import PageHeader from '../../shared/PageHeader'
import { defaultPresets } from '../../../common/presets'
import { presetStore } from '../../store'
import { setComponentPageTitle } from '../../shared/util'

const PresetList: Component = () => {
  setComponentPageTitle('Presets')
  const nav = useNavigate()
  const state = presetStore()
  const defaults = Object.entries(defaultPresets).map(([name, cfg]) => ({
    name,
    label: `Default: ${cfg.name}`,
    cfg,
  }))
  const [deleting, setDeleting] = createSignal<string>()

  const deletePreset = () => {
    const presetId = deleting()
    if (!presetId) return

    presetStore.deletePreset(presetId, () => nav('/presets'))
    setDeleting()
  }

  onMount(() => {
    presetStore.getPresets()
  })

  return (
    <>
      <PageHeader title="Generation Presets" subtitle="generation settings presets" />
      <div class="mb-4 flex w-full justify-end">
        <A href="/presets/new">
          <Button>
            <Plus />
            New Preset
          </Button>
        </A>
      </div>

      <div class="flex flex-col items-center gap-2">
        <For each={state.presets}>
          {(preset) => (
            <div class="flex w-full items-center gap-2">
              <A
                href={`/presets/${preset._id}`}
                class="flex h-12 w-full gap-2 rounded-xl bg-[var(--bg-800)] hover:bg-[var(--bg-600)]"
              >
                <div class="ml-4 flex w-full items-center">{preset.name}</div>
              </A>
              <Button
                schema="clear"
                size="sm"
                onClick={() => nav(`/presets/new?preset=${preset._id}`)}
                class="icon-button"
              >
                <Copy />
              </Button>
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

        <For each={defaults}>
          {(preset) => (
            <div class="flex w-full items-center gap-2">
              <A
                href={`/presets/default?preset=${preset.name}`}
                class="flex h-12 w-full gap-2 rounded-xl bg-[var(--bg-800)] hover:bg-[var(--bg-600)]"
              >
                <div class="ml-4 flex w-full items-center">{preset.label}</div>
              </A>
              <Button
                schema="clear"
                size="sm"
                onClick={() => nav(`/presets/new?preset=${preset.name}`)}
                class="icon-button"
              >
                <Copy />
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
