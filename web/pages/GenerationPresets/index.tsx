import { A, useNavigate, useParams, useSearchParams } from '@solidjs/router'
import { Edit, Plus, Save, X } from 'lucide-solid'
import { Component, createEffect, createSignal, Show } from 'solid-js'
import { defaultPresets, isDefaultPreset, presetValidator } from '../../../common/presets'
import { AppSchema } from '../../../srv/db/schema'
import Button from '../../shared/Button'
import Select, { Option } from '../../shared/Select'
import GenerationSettings from '../../shared/GenerationSettings'
import Modal, { ConfirmModal } from '../../shared/Modal'
import PageHeader from '../../shared/PageHeader'
import TextInput from '../../shared/TextInput'
import { getStrictForm, setComponentPageTitle } from '../../shared/util'
import { presetStore, toastStore } from '../../store'
import { AI_ADAPTERS } from '../../../common/adapters'

export const GenerationPresetsPage: Component = () => {
  const { updateTitle } = setComponentPageTitle('Preset')
  let ref: any

  const params = useParams()
  const [query] = useSearchParams()

  const nav = useNavigate()
  const [edit, setEdit] = createSignal(false)
  const [editing, setEditing] = createSignal<AppSchema.UserGenPreset>()
  const [deleting, setDeleting] = createSignal(false)

  const onEdit = (preset: AppSchema.UserGenPreset) => {
    nav(`/presets/${preset._id}`)
  }

  const state = presetStore(({ presets, saving }) => ({
    saving,
    presets,
    items: presets.map<Option>((p) => ({ label: p.name, value: p._id })),
  }))

  createEffect(async () => {
    if (params.id === 'new') {
      const copySource = query.preset
      if (copySource) {
        updateTitle(`Copy preset ${copySource}`)
      } else {
        updateTitle(`Create preset`)
      }
      setEditing()
      await Promise.resolve()
      const template = isDefaultPreset(query.preset)
        ? defaultPresets[query.preset]
        : state.presets.find((p) => p._id === query.preset)
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
      const preset = state.presets.find((p) => p._id === params.id)
      setEditing(preset)
      return
    }

    if (params.id && preset && preset._id !== params.id) {
      setEditing()
      await Promise.resolve()
      const preset = state.presets.find((p) => p._id === params.id)
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

  const onSave = (ev: Event) => {
    ev.preventDefault()
    if (state.saving) return
    const validator = { ...presetValidator, service: ['', ...AI_ADAPTERS] } as const
    const body = getStrictForm(ref, validator)

    if (body.service === '') {
      toastStore.error(`You must select an AI service before saving`)
      return
    }

    const prev = editing()
    if (prev?._id) {
      presetStore.updatePreset(prev._id, body as any)
    } else {
      presetStore.createPreset(body as any, (newPreset) => {
        nav(`/presets/${newPreset._id}`)
      })
    }
  }

  return (
    <>
      <PageHeader title="Generation Presets" subtitle="Generation presets" />
      <div class="flex flex-col gap-2">
        <Show when={params.id === 'default'}>
          <div class="font-bold">
            This is a default preset and cannot be saved.{' '}
            <A class="link" href={`/presets/new?preset=${query.preset}`}>
              Click here
            </A>{' '}
            if you'd like to create a copy of this preset.
          </div>
        </Show>
        <div class="flex flex-col gap-4 p-2">
          <Show when={editing()}>
            <form ref={ref} onSubmit={onSave}>
              <div class="flex gap-4">
                <Show when={state.presets.length > 1}>
                  <Button onClick={() => setEdit(true)}>Load Preset</Button>
                </Show>
                <Button onClick={startNew}>
                  <Plus />
                  New Preset
                </Button>
              </div>
              <div class="flex flex-col gap-4">
                <TextInput
                  fieldName="id"
                  label="Id"
                  value={editing()?._id || 'New Preset'}
                  disabled
                />
                <TextInput
                  fieldName="name"
                  label="Name"
                  helperText="A name or short description of your preset"
                  placeholder="E.g. Pygmalion Creative"
                  value={editing()?.name}
                  required
                />
                <GenerationSettings inherit={editing()} />
              </div>
              <Show when={editing()?.userId !== 'SYSTEM'}>
                <div class="flex flex-row justify-end">
                  <Button type="submit" disabled={state.saving}>
                    <Save /> Save
                  </Button>
                </div>
              </Show>
            </form>
          </Show>
        </div>
      </div>
      <EditPreset show={edit()} close={() => setEdit(false)} select={onEdit} />
      <ConfirmModal
        show={deleting()}
        close={() => setDeleting(false)}
        confirm={deletePreset}
        message="Are you sure you wish to delete this preset?"
      />
    </>
  )
}

export default GenerationPresetsPage

const emptyPreset: AppSchema.GenSettings = {
  ...defaultPresets.basic,
  name: '',
  maxTokens: 80,
}

const EditPreset: Component<{
  show: boolean
  close: () => void
  select: (preset: AppSchema.UserGenPreset) => void
}> = (props) => {
  const params = useParams()

  let ref: any
  const state = presetStore()

  const select = () => {
    const body = getStrictForm(ref, { preset: 'string' })
    const preset = state.presets.find((preset) => preset._id === body.preset)
    props.select(preset!)
    props.close()
  }

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
      <form ref={ref}>
        <Select
          fieldName="preset"
          label="Preset"
          helperText="Select a preset to start editing. If you are currently editing a preset, it won't be in the list."
          items={state.presets
            .filter((pre) => pre._id !== params.id)
            .map((pre) => ({ label: pre.name, value: pre._id }))}
        />
      </form>
    </Modal>
  )
}
