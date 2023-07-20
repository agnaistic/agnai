import { A, useNavigate } from '@solidjs/router'
import { Copy, Plus, Trash } from 'lucide-solid'
import { Component, createSignal, For, onMount } from 'solid-js'
import Button from '../../shared/Button'
import { ConfirmModal } from '../../shared/Modal'
import PageHeader from '../../shared/PageHeader'
import { defaultPresets } from '../../../common/presets'
import { presetStore } from '../../store'
import { setComponentPageTitle } from '../../shared/util'
import { getServiceName, sortByLabel } from '/web/shared/adapter'

const PresetList: Component = () => {
  setComponentPageTitle('Presets')
  const nav = useNavigate()
  const state = presetStore((s) => ({
    presets: s.presets
      .map((pre) => ({ ...pre, label: `[${getServiceName(pre.service)}] ${pre.name}` }))
      .sort(sortByLabel),
  }))

  const defaults = Object.entries(defaultPresets)
    .map(([id, cfg]) => ({ ...cfg, label: `[${cfg.service}] ${cfg.name}`, _id: id }))
    .sort(sortByLabel)
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
      <PageHeader title="Generation Presets" />
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
                class="bg-800 flex h-12 w-full gap-2 rounded-xl hover:bg-[var(--bg-600)]"
              >
                <div class="ml-4 flex w-full items-center">
                  <div>
                    <span class="mr-1 text-xs italic text-[var(--text-600)]">
                      {getServiceName(preset.service)}
                    </span>
                    {preset.name}
                  </div>
                </div>
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

        <div>Built-in Presets</div>
        <For each={defaults}>
          {(preset) => (
            <div class="flex w-full items-center gap-2">
              <A
                href={`/presets/default?preset=${preset._id}`}
                class="bg-800 flex h-12 w-full gap-2 rounded-xl hover:bg-[var(--bg-600)]"
              >
                <div class="ml-4 flex w-full items-center">
                  {' '}
                  <span class="mr-1 text-xs italic text-[var(--text-600)]">
                    {getServiceName(preset.service)}
                  </span>
                  {preset.name}
                </div>
              </A>
              <Button
                schema="clear"
                size="sm"
                onClick={() => nav(`/presets/new?preset=${preset._id}`)}
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
