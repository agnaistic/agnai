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
import { getPresetForm, PresetState } from '/web/shared/PresetSettings/types'

export const GenerationPresetsPage: Component = () => {
  const { updateTitle } = setComponentPageTitle('Preset')
  const params = useParams()
  const [query] = useSearchParams()

  const nav = useNavigate()
  const [selecting, setSelecting] = createSignal(false)
  const [editing, setEditing] = createSignal<AppSchema.UserGenPreset>()
  const [deleting, setDeleting] = createSignal(false)
  const [state, setState] = createSignal<PresetState>()

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

      setEditing()
      await Promise.resolve()

      if (presets.importing) {
        setEditing({ ...presets.importing, kind: 'gen-setting', userId: '', _id: '', name: '' })
        presetStore.setImportPreset()
        return
      }

      const template = isDefaultPreset(query.preset)
        ? defaultPresets[query.preset]
        : presets.presets.find((p) => p._id === query.preset)
      const preset = template ? { ...template } : { ...emptyPreset }
      setEditing({ ...emptyPreset, ...preset, _id: '', kind: 'gen-setting', userId: '' })
      return
    } else if (params.id === 'default') {
      setEditing()
      await Promise.resolve()
      if (!isDefaultPreset(query.preset)) return
      setEditing({
        ...emptyPreset,
        ...defaultPresets[query.preset],
        _id: '',
        kind: 'gen-setting',
        userId: 'SYSTEM',
      })
      return
    }

    const preset = editing()

    if (params.id && !preset) {
      const preset = presets.presets.find((p) => p._id === params.id)
      setEditing(preset)
      return
    }

    if (params.id && preset && preset._id !== params.id) {
      setEditing()
      await Promise.resolve()
      const preset = presets.presets.find((p) => p._id === params.id)
      setEditing(preset)
    }

    if (params.id && preset) {
      updateTitle(`Edit preset ${preset.name}`)
    }
  })

  const startNew = () => {
    nav('/presets/new')
  }

  const deletePreset = () => {
    const preset = editing()
    if (!preset) return

    presetStore.deletePreset(preset._id, () => nav('/presets'))
    setEditing()
  }

  const onSave = (ev?: any) => {
    ev?.preventDefault()
    if (!state()) return
    if (presets.saving) return
    const body = getPresetForm(state()!)

    if (!body.service) {
      toastStore.error(`You must select an AI service before saving`)
      return
    }

    const prev = editing()

    if (prev?._id) {
      presetStore.updatePreset(prev._id, body as any)
    } else {
      presetStore.createPreset(body as any, (newPreset) => {
        nav(`/presets/${newPreset._id}`)
        setEditing(newPreset)
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
          <Show when={editing()}>
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
                <div>ID: {editing()?._id || 'New Preset'}</div>
                <TextInput
                  fieldName="id"
                  value={editing()?._id || 'New Preset'}
                  disabled
                  class="hidden"
                />
                <TextInput
                  fieldName="name"
                  label="Name"
                  helperText="A name or short description of your preset"
                  placeholder="Preset name"
                  value={editing()?.name}
                  required
                  parentClass="mb-2"
                />
                <PresetSettings
                  inherit={editing() as any}
                  state={(state) => setState(state)}
                  disabled={params.id === 'default'}
                  noSave
                />
              </div>
              <Show when={editing()?.userId !== 'SYSTEM'}>
                <div class="flex flex-row justify-end">
                  <Button disabled={presets.saving} onClick={onSave}>
                    <Save /> Save
                  </Button>
                </div>
              </Show>
            </form>
          </Show>
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
