import { A, useLocation, useNavigate } from '@solidjs/router'
import Copy from 'lucide-solid/icons/copy'
import Download from 'lucide-solid/icons/download'
import Import from 'lucide-solid/icons/import'
import Plus from 'lucide-solid/icons/plus'
import Trash from 'lucide-solid/icons/trash'
import { Component, createMemo, createSignal, For, Match, onMount, Show, Switch } from 'solid-js'
import Button from '../../shared/Button'
import Modal, { ConfirmModal } from '../../shared/Modal'
import PageHeader from '../../shared/PageHeader'
import { presetValidator } from '../../../common/presets'
import { exportPreset, presetStore, toastStore, userStore } from '../../store'
import { capitalize, setComponentPageTitle, tryParseImport } from '../../shared/util'
import { getPresetLabel, getServiceName, sortByLabel } from '/web/shared/adapter'
import FileInput, { FileInputResult, getFileAsString } from '/web/shared/FileInput'
import { validateBody } from '/common/valid'
import { Page } from '/web/Layout'
import TextInput from '/web/shared/TextInput'
import { ProviderList } from './ProviderList'
import Divider from '/web/shared/Divider'

const PresetList: Component = () => {
  setComponentPageTitle('Presets')

  const loc = useLocation()
  const nav = useNavigate()

  const state = presetStore((s) => ({
    presets: s.presets
      .map((pre) => ({ ...pre, label: `[${getServiceName(pre.service)}] ${pre.name}` }))
      .sort(sortByLabel),
  }))

  const self = userStore((s) => ({ user: s.user }))

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
      <PageHeader title={capitalize(loc.pathname.slice(1))} />
      <div class="flex gap-1">
        <Button
          size="sm"
          schema={loc.pathname.toLowerCase() === '/presets' ? 'primary' : 'secondary'}
          onClick={() => nav('/presets')}
        >
          Presets
        </Button>

        <Button
          size="sm"
          schema={loc.pathname.toLowerCase() === '/providers' ? 'primary' : 'secondary'}
          onClick={() => nav('/providers')}
        >
          Providers
        </Button>
      </div>
      <Divider class="!my-2" />

      <Switch>
        <Match when={loc.pathname === '/providers'}>
          <ProviderList />
        </Match>

        <Match when>
          <div class="flex flex-col items-center gap-2">
            <div class="flex w-full justify-between">
              <div>
                <TextInput
                  placeholder="Filter..."
                  onChange={(ev) => setFilter(ev.currentTarget.value)}
                />
              </div>
              <div class="flex w-full justify-end gap-2">
                <Button href="/presets/new">
                  <Plus />
                  New
                </Button>

                <Button onClick={() => setImporting(true)}>
                  <Import size={20} /> Import
                </Button>
              </div>
            </div>

            <For each={presets()}>
              {(preset) => {
                const label = getPresetLabel(preset)
                return (
                  <div
                    class="flex w-full items-center gap-1 rounded-xl py-1 "
                    classList={{
                      'bg-800 hover:bg-[var(--bg-600)]': self.user?.defaultPreset !== preset._id,
                      'bg-[var(--hl-800)] hover:bg-[var(--hl-600)]':
                        self.user?.defaultPreset === preset._id,
                    }}
                  >
                    <A href={`/presets/${preset._id}`} class=" flex w-full">
                      <div class="ml-4 flex w-full flex-col items-start">
                        <div>
                          <div>{preset.name}</div>
                          <div class="mr-1 text-xs text-[var(--text-600)]">
                            {label.category} | {label.prefix}
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
                )
              }}
            </For>
          </div>
        </Match>
      </Switch>

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
      const parsed = tryParseImport(content)

      const { errors, original } = validateBody(importValid, parsed, { notThrow: true })
      if (errors.length) {
        toastStore.error(`Preset is not valid: ${errors.join(', ')}`)
        console.log(errors)
        return
      }

      presetStore.setImportPreset(original as any)
      props.success()
    } catch (ex: any) {
      toastStore.error(ex, { prefix: `Could not parse preset` })
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
