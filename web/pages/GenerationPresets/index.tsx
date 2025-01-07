import { A, useNavigate, useParams, useSearchParams } from '@solidjs/router'
import { Edit, Plus, Save, X } from 'lucide-solid'
import { Component, createSignal, onMount, Show } from 'solid-js'
import { defaultPresets, isDefaultPreset } from '../../../common/presets'
import { AppSchema } from '../../../common/types/schema'
import Button from '../../shared/Button'
import Select, { Option } from '../../shared/Select'
import Modal, { ConfirmModal } from '../../shared/Modal'
import PageHeader from '../../shared/PageHeader'
import TextInput from '../../shared/TextInput'
import { setComponentPageTitle } from '../../shared/util'
import { presetStore, toastStore } from '../../store'
import Loading from '/web/shared/Loading'
import { TitleCard } from '/web/shared/Card'
import { Page } from '/web/Layout'
import PresetSettings from '/web/shared/PresetSettings'
import { getPresetEditor, getPresetForm } from '/web/shared/PresetSettings/types'
import { templates } from '/common/presets/templates'

export const GenerationPresetsPage: Component = () => {
  const { updateTitle } = setComponentPageTitle('Preset')
  const params = useParams()
  const [query] = useSearchParams()

  const nav = useNavigate()
  const [selecting, setSelecting] = createSignal(false)
  const [deleting, setDeleting] = createSignal(false)

  const [store, setStore, hides] = getPresetEditor()

  const onEdit = (preset: AppSchema.UserGenPreset) => {
    nav(`/presets/${preset._id}`)
  }

  const presets = presetStore(({ presets, saving, importing }) => ({
    saving,
    presets,
    items: presets.map<Option>((p) => ({ label: p.name, value: p._id })),
    importing,
    editing: isDefaultPreset(query.preset)
      ? defaultPresets[query.preset]
      : presets.find((pre) => pre._id === query.preset || params.id),
  }))

  onMount(async () => {
    if (params.id === 'new') {
      const copySource = query.preset
      if (copySource) {
        updateTitle(`Copy preset ${copySource}`)
      } else if (presets.importing) {
        updateTitle(`Import preset`)
      } else {
        updateTitle(`Create preset`)
      }

      if (presets.importing) {
        setStore({
          ...presets.importing,
          _id: '',
          name: presets.importing.name ? `${presets.importing.name} - Imported` : 'Imported Preset',
        })
        presetStore.setImportPreset()
        return
      }

      const template = isDefaultPreset(query.preset)
        ? defaultPresets[query.preset]
        : presets.presets.find((p) => p._id === query.preset)
      const preset = template ? { ...template } : { ...emptyPreset }
      setStore({ ...emptyPreset, ...preset, _id: '' })
      return
    } else if (params.id === 'default') {
      if (!isDefaultPreset(query.preset)) return
      setStore({
        ...emptyPreset,
        ...defaultPresets[query.preset],
        _id: '',
        userId: 'SYSTEM',
      })
      return
    }

    if (params.id && store._id !== params.id) {
      const preset = presets.presets.find((p) => p._id === params.id)
      setStore(preset as any)
      return
    }

    if (params.id && store._id !== params.id) {
      const preset = presets.presets.find((p) => p._id === params.id)
      setStore(preset!)
    }

    if (params.id && store) {
      updateTitle(`Edit preset ${store.name}`)
    }
  })

  const startNew = () => {
    nav('/presets/new')
  }

  const deletePreset = () => {
    presetStore.deletePreset(store._id, () => nav('/presets'))
    setStore(emptyPreset)
  }

  const onSave = (ev?: any) => {
    ev?.preventDefault()
    if (presets.saving) return
    const body = getPresetForm(store)

    if (!body.service) {
      toastStore.error(`You must select an AI service before saving`)
      return
    }

    if (store?._id) {
      presetStore.updatePreset(store._id, body as any)
    } else {
      presetStore.createPreset(body as any, (newPreset) => {
        nav(`/presets/${newPreset._id}`)
        setStore(newPreset)
      })
    }
  }

  if (params.id && params.id !== 'new' && !presets.editing) {
    return (
      <Page>
        <PageHeader title="Generation Presets" />
        <Loading />
      </Page>
    )
  }

  return (
    <Page>
      <PageHeader title="Generation Presets" />
      <div class="flex flex-col gap-2 pb-10">
        <Show when={params.id === 'default'}>
          <TitleCard type="orange" class="font-bold">
            This is a built-in preset and cannot be saved.{' '}
            <A class="link" href={`/presets/new?preset=${query.preset}`}>
              Click here
            </A>{' '}
            if you'd like to create a copy of this preset.
          </TitleCard>
        </Show>
        <div class="flex flex-col gap-4 p-2">
          <form onSubmit={onSave} class="flex flex-col gap-4">
            <div class="flex gap-4">
              <Show when={presets.presets.length > 1}>
                <Button onClick={() => setSelecting(true)}>Load Preset</Button>
              </Show>
              <Button onClick={startNew}>
                <Plus />
                New Preset
              </Button>
            </div>
            <div class="flex flex-col">
              <div>ID: {store._id || 'New Preset'}</div>
              <TextInput fieldName="id" value={store._id || 'New Preset'} disabled class="hidden" />
              <TextInput
                fieldName="name"
                label="Name"
                helperText="A name or short description of your preset"
                placeholder="Preset name"
                value={store.name}
                onChange={(ev) => setStore('name', ev.currentTarget.value)}
                required
                parentClass="mb-2"
              />

              <PresetSettings store={store} setter={setStore} hides={hides} noSave />
            </div>
            <Show when={store.userId !== 'SYSTEM'}>
              <div class="flex flex-row justify-end">
                <Button disabled={presets.saving} onClick={onSave}>
                  <Save /> Save
                </Button>
              </div>
            </Show>
          </form>
        </div>
      </div>
      <EditPreset show={selecting()} close={() => setSelecting(false)} select={onEdit} />
      <ConfirmModal
        show={deleting()}
        close={() => setDeleting(false)}
        confirm={deletePreset}
        message="Are you sure you wish to delete this preset?"
      />
    </Page>
  )
}

export default GenerationPresetsPage

const emptyPreset: AppSchema.GenSettings = {
  ...defaultPresets.basic,
  gaslight: templates.Universal,
  service: '' as any,
  name: '',
  maxTokens: 300,
}

const EditPreset: Component<{
  show: boolean
  close: () => void
  select: (preset: AppSchema.UserGenPreset) => void
}> = (props) => {
  const params = useParams()
  const state = presetStore()

  const select = () => {
    const preset = state.presets.find((preset) => preset._id === id())
    props.select(preset!)
    props.close()
  }

  const [id, setId] = createSignal(state.presets[0]?._id)

  return (
    <Modal
      show={props.show}
      close={props.close}
      title="Load Preset"
      footer={
        <>
          <Button schema="secondary" onClick={props.close}>
            <X /> Cancel
          </Button>
          <Button onClick={select}>
            <Edit /> Load Preset
          </Button>
        </>
      }
    >
      <form>
        <Select
          label="Preset"
          helperText="Select a preset to start editing. If you are currently editing a preset, it won't be in the list."
          items={state.presets
            .filter((pre) => pre._id !== params.id)
            .map((pre) => ({ label: pre.name, value: pre._id }))}
          onChange={(ev) => setId(ev.value)}
        />
      </form>
    </Modal>
  )
}
