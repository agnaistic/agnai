import { A, useNavigate } from '@solidjs/router'
import { Copy, Download, Import, Plus, Trash } from 'lucide-solid'
import { Component, createMemo, createSignal, For, onMount, Show } from 'solid-js'
import Button from '../../shared/Button'
import Modal, { ConfirmModal } from '../../shared/Modal'
import PageHeader from '../../shared/PageHeader'
import { presetValidator } from '../../../common/presets'
import { exportPreset, presetStore, toastStore } from '../../store'
import { setComponentPageTitle } from '../../shared/util'
import { getServiceName, sortByLabel } from '/web/shared/adapter'
import FileInput, { FileInputResult, getFileAsString } from '/web/shared/FileInput'
import { validateBody } from '/common/valid'
import { Page } from '/web/Layout'
import TextInput from '/web/shared/TextInput'

const PresetList: Component = () => {
  setComponentPageTitle('Presets')
  const nav = useNavigate()
  const state = presetStore((s) => ({
    presets: s.presets
      .map((pre) => ({ ...pre, label: `[${getServiceName(pre.service)}] ${pre.name}` }))
      .sort(sortByLabel),
  }))

  const [deleting, setDeleting] = createSignal<string>()
  const [importing, setImporting] = createSignal(false)
  const [filter, setFilter] = createSignal('')

  const presets = createMemo(() => {
    const search = filter().trim().toLocaleUpperCase()
    if (!search) return state.presets

    return state.presets.filter((p) => p.name.toLocaleUpperCase().includes(search))
  })

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
    <Page>
      <PageHeader title="Presets" />
      <div class="flex justify-between">
        <div>
          <TextInput placeholder="Filter..." onChange={(ev) => setFilter(ev.currentTarget.value)} />
        </div>
        <div class="mb-4 flex w-full justify-end gap-2">
          <A href="/presets/new">
            <Button>
              <Plus />
              New
            </Button>
          </A>
          <Button onClick={() => setImporting(true)}>
            <Import size={20} /> Import
          </Button>
        </div>
      </div>

      {/* <div class="flex gap-2 pb-1">
        <Button size="sm" schema="clear" class="icon-button">
          <Sliders size={20} />
        </Button>
        <Button size="sm" schema="clear" class="icon-button">
          <Image size={20} />
        </Button>
      </div> */}

      <div class="flex flex-col items-center gap-2">
        <For each={presets()}>
          {(preset) => (
            <div class="bg-800 flex w-full items-center gap-1 rounded-xl py-1 hover:bg-[var(--bg-600)]">
              <A href={`/presets/${preset._id}`} class=" flex w-full">
                <div class="ml-4 flex w-full flex-col items-start">
                  <div>
                    <div>{preset.name}</div>
                    <div class="mr-1 text-xs italic text-[var(--text-600)]">
                      {getServiceName(preset.service)}
                    </div>
                  </div>
                </div>
              </A>
              <Button
                schema="clear"
                size="sm"
                onClick={() => exportPreset(preset)}
                class="icon-button"
              >
                <Download size={20} />
              </Button>
              <Button
                schema="clear"
                size="sm"
                onClick={() => nav(`/presets/new?preset=${preset._id}`)}
                class="icon-button"
              >
                <Copy size={20} />
              </Button>
              <Button
                schema="clear"
                size="sm"
                onClick={() => setDeleting(preset._id)}
                class="icon-button"
              >
                <Trash size={20} />
              </Button>
            </div>
          )}
        </For>
      </div>

      <Show when={importing()}>
        <ImportPreset success={() => nav(`/presets/new`)} close={() => setImporting(false)} />
      </Show>

      <ConfirmModal
        show={!!deleting()}
        close={() => setDeleting()}
        confirm={deletePreset}
        message="Are you sure you wish to delete this preset?"
      />
    </Page>
  )
}

const importValid = {
  ...presetValidator,
  order: 'any?',
  disabledSamplers: 'any?',
  name: 'string?',
  oaiModel: 'string?',
  claudeModel: 'string?',
  json: 'any?',
  jsonSource: 'string?',
  jsonEnabled: 'boolean?',
  ultimeJailbreak: 'string?',
} as const

const ImportPreset: Component<{ close: () => void; success: () => void }> = (props) => {
  const onChange = async (files: FileInputResult[]) => {
    if (!files.length) {
      return
    }

    try {
      const content = await getFileAsString(files[0])
      const parsed = JSON.parse(content)

      const { errors, original } = validateBody(importValid, parsed, { notThrow: true })
      if (errors.length) {
        toastStore.error(`Preset is not valid: ${errors.join(', ')}`)
        console.log(errors)
        return
      }

      presetStore.setImportPreset(original as any)
      props.success()
    } catch (ex: any) {
      toastStore.error(`Could not parse preset: ${ex.message}`)
      return
    }
  }

  return (
    <Modal show close={props.close} title="Import Preset">
      <FileInput fieldName="file" label="Preset JSON" onUpdate={onChange} />
    </Modal>
  )
}

export default PresetList
