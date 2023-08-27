import { A, useNavigate, useParams, useSearchParams } from '@solidjs/router'
import { Edit, Plus, Save, X } from 'lucide-solid'
import { Component, createEffect, createSignal, Show } from 'solid-js'
import { defaultPresets, isDefaultPreset, presetValidator } from '../../../common/presets'
import { AppSchema } from '../../../common/types/schema'
import Button from '../../shared/Button'
import Select, { Option } from '../../shared/Select'
import GenerationSettings, { getRegisteredSettings } from '../../shared/GenerationSettings'
import Modal, { ConfirmModal } from '../../shared/Modal'
import PageHeader from '../../shared/PageHeader'
import TextInput from '../../shared/TextInput'
import { getStrictForm, setComponentPageTitle } from '../../shared/util'
import { presetStore, settingStore, toastStore } from '../../store'
import { AIAdapter, AI_ADAPTERS } from '../../../common/adapters'
import Loading from '/web/shared/Loading'

export const Subscription: Component = () => {
  const { updateTitle } = setComponentPageTitle('Subscription')
  let ref: any

  const params = useParams()
  const [query] = useSearchParams()

  const nav = useNavigate()
  const [edit, setEdit] = createSignal(false)
  const [editing, setEditing] = createSignal<AppSchema.SubscriptionPreset>()
  const [deleting, setDeleting] = createSignal(false)
  const [missingPlaceholder, setMissingPlaceholder] = createSignal<boolean>()

  const onEdit = (preset: AppSchema.SubscriptionPreset) => {
    nav(`/admin/subscriptions/${preset._id}`)
  }

  const cfg = settingStore((s) => s.config)

  const state = presetStore(({ subs, saving }) => ({
    saving,
    presets: subs,
    items: subs.map<Option>((p) => ({ label: p.name, value: p._id })),
    editing: isDefaultPreset(query.preset)
      ? defaultPresets[query.preset]
      : subs.find((pre) => pre._id === query.preset || params.id),
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
      setEditing({ ...emptyPreset, ...preset, _id: '', kind: 'subscription-setting', subLevel: 0 })
      return
    } else if (params.id === 'default') {
      setEditing()
      await Promise.resolve()
      if (!isDefaultPreset(query.preset)) return
      setEditing({
        ...emptyPreset,
        ...defaultPresets[query.preset],
        _id: '',
        subLevel: 0,
        kind: 'subscription-setting',
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

  const onSave = (_ev: Event, force?: boolean) => {
    if (state.saving) return
    const validator = {
      ...presetValidator,
      service: ['', ...AI_ADAPTERS],
      thirdPartyFormat: 'string?',
    } as const
    const body = getStrictForm(ref, validator)

    body.thirdPartyFormat = body.thirdPartyFormat || (null as any)

    if (body.openRouterModel) {
      const actual = cfg.openRouter.models.find((or) => or.id === body.openRouterModel)
      body.openRouterModel = actual || undefined
    }

    if (body.service === '') {
      toastStore.error(`You must select an AI service before saving`)
      return
    }

    if (!force && body.gaslight && !body.gaslight.includes('{{personality}}')) {
      setMissingPlaceholder(true)
      return
    }

    const prev = editing()
    const registered = getRegisteredSettings(body.service as AIAdapter, ref)
    body.registered = { ...prev?.registered }
    body.registered[body.service] = registered

    if (prev?._id) {
      presetStore.updatePreset(prev._id, body as any)
    } else {
      presetStore.createPreset(body as any, (newPreset) => {
        nav(`/presets/${newPreset._id}`)
      })
    }
    setMissingPlaceholder(false)
  }

  if (params.id && params.id !== 'new' && !state.editing) {
    return (
      <>
        <PageHeader title="Subscription" />
        <Loading />
      </>
    )
  }

  return (
    <>
      <PageHeader title="Subscription" />
      <div class="flex flex-col gap-2 pb-10">
        <div class="flex flex-col gap-4 p-2">
          <Show when={editing()}>
            <form ref={ref} onSubmit={onSave} class="flex flex-col gap-4">
              <div class="flex gap-4">
                <Show when={state.presets.length > 1}>
                  <Button onClick={() => setEdit(true)}>Load Preset</Button>
                </Show>
                <Button onClick={startNew}>
                  <Plus />
                  New Subscription
                </Button>
              </div>
              <div class="flex flex-col">
                <div>ID: {editing()?._id || 'New Subscription'}</div>
                <TextInput
                  fieldName="id"
                  value={editing()?._id || 'New Subscription'}
                  disabled
                  class="hidden"
                />
                <TextInput
                  fieldName="name"
                  label="Name"
                  helperText="A name or short description of your preset"
                  placeholder="E.g. Premium+++++"
                  value={editing()?.name}
                  required
                  parentClass="mb-2"
                />
                <GenerationSettings inherit={editing()} disabled={params.id === 'default'} />
              </div>
              <div class="flex flex-row justify-end">
                <Button disabled={state.saving} onClick={onSave}>
                  <Save /> Save
                </Button>
              </div>
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
      <ConfirmModal
        show={!!missingPlaceholder()}
        close={() => setMissingPlaceholder(false)}
        confirm={() => onSave(ref, true)}
        message={
          <div class="flex flex-col items-center gap-2 text-sm">
            <div>
              Your gaslight is missing a <code>{'{{personality}}'}</code> placeholder. This is
              almost never what you want. It is recommended for your gaslight to contain the
              placeholders:
              <br /> <code>{'{{personality}}, {{scenario}} and {{memory}}'}</code>
            </div>

            <p>Are you sure you wish to proceed?</p>
          </div>
        }
      />
    </>
  )
}

export default Subscription

const emptyPreset: AppSchema.GenSettings = {
  ...defaultPresets.basic,
  ...defaultPresets.llama,
  name: 'New Subscription',
  temp: 0.85,
  topK: 0,
  topP: 1,
  tailFreeSampling: 0.95,
  repetitionPenalty: 1.1,
  repetitionPenaltyRange: 64,
  maxContextLength: 4090,
  maxTokens: 250,
  streamResponse: true,
}

const EditPreset: Component<{
  show: boolean
  close: () => void
  select: (preset: AppSchema.SubscriptionPreset) => void
}> = (props) => {
  const params = useParams()

  let ref: any
  const state = presetStore()

  const select = () => {
    const body = getStrictForm(ref, { preset: 'string' })
    const preset = state.subs.find((preset) => preset._id === body.preset)
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
