import { A, useNavigate, useParams, useSearchParams } from '@solidjs/router'
import { Edit, Plus, Save, X } from 'lucide-solid'
import { Component, createEffect, createSignal, Show } from 'solid-js'
import { defaultPresets, isDefaultPreset } from '../../../common/presets'
import { AppSchema } from '../../../common/types/schema'
import Button from '../../shared/Button'
import Select, { Option } from '../../shared/Select'
import GenerationSettings, { getPresetFormData } from '../../shared/GenerationSettings'
import Modal, { ConfirmModal } from '../../shared/Modal'
import PageHeader from '../../shared/PageHeader'
import TextInput from '../../shared/TextInput'
import { getStrictForm, setComponentPageTitle } from '../../shared/util'
import { presetStore, toastStore } from '../../store'
import Loading from '/web/shared/Loading'
import { TitleCard } from '/web/shared/Card'
import { Trans, useTransContext } from '@mbarzda/solid-i18next'

export const GenerationPresetsPage: Component = () => {
  const [t] = useTransContext()

  const { updateTitle } = setComponentPageTitle(t('preset'))
  let ref: any

  const params = useParams()
  const [query] = useSearchParams()

  const nav = useNavigate()
  const [edit, setEdit] = createSignal(false)
  const [editing, setEditing] = createSignal<AppSchema.UserGenPreset>()
  const [deleting, setDeleting] = createSignal(false)
  const [missingPlaceholder, setMissingPlaceholder] = createSignal<boolean>()

  const onEdit = (preset: AppSchema.UserGenPreset) => {
    nav(`/presets/${preset._id}`)
  }

  const state = presetStore(({ presets, saving }) => ({
    saving,
    presets,
    items: presets.map<Option>((p) => ({ label: p.name, value: p._id })),
    editing: isDefaultPreset(query.preset)
      ? defaultPresets[query.preset]
      : presets.find((pre) => pre._id === query.preset || params.id),
  }))

  createEffect(async () => {
    if (params.id === 'new') {
      const copySource = query.preset
      if (copySource) {
        updateTitle(t('copy_preset_x', { source: copySource }))
      } else {
        updateTitle(t('create_preset'))
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
      updateTitle(t('edit_preset_x', { source: preset.name }))
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
    const body = getPresetFormData(ref)

    if (!body.service) {
      toastStore.error(t('you_must_select_an_ai_service_before_saving'))
      return
    }

    if (!force && body.gaslight && !body.gaslight.includes('{{personality}}')) {
      setMissingPlaceholder(true)
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
    setMissingPlaceholder(false)
  }

  if (params.id && params.id !== 'new' && !state.editing) {
    return (
      <>
        <PageHeader title={t('generation_presets')} />
        <Loading />
      </>
    )
  }

  return (
    <>
      <PageHeader title={t('generation_presets')} />
      <div class="flex flex-col gap-2 pb-10">
        <Show when={params.id === 'default'}>
          <TitleCard type="orange" class="font-bold">
            <Trans key="this_is_a_built_in_preset">
              This is a built-in preset and cannot be saved.
              <A class="link ml-2 mr-2" href={`/presets/new?preset=${query.preset}`}>
                Click here
              </A>
              if you'd like to create a copy of this preset.
            </Trans>
          </TitleCard>
        </Show>
        <div class="flex flex-col gap-4 p-2">
          <Show when={editing()}>
            <form ref={ref} onSubmit={onSave} class="flex flex-col gap-4">
              <div class="flex gap-4">
                <Show when={state.presets.length > 1}>
                  <Button onClick={() => setEdit(true)}>{t('load_preset')}</Button>
                </Show>
                <Button onClick={startNew}>
                  <Plus />
                  {t('new_preset')}
                </Button>
              </div>
              <div class="flex flex-col">
                <div>ID: {editing()?._id || t('new_preset')}</div>
                <TextInput
                  fieldName="id"
                  value={editing()?._id || t('new_preset')}
                  disabled
                  class="hidden"
                />
                <TextInput
                  fieldName="name"
                  label={t('name')}
                  helperText={t('a_name_or_short_description_for_your_preset')}
                  placeholder={t('preset_name')}
                  value={editing()?.name}
                  required
                  parentClass="mb-2"
                />
                <GenerationSettings
                  inherit={editing()}
                  disabled={params.id === 'default'}
                  onSave={() => {}}
                />
              </div>
              <Show when={editing()?.userId !== 'SYSTEM'}>
                <div class="flex flex-row justify-end">
                  <Button disabled={state.saving} onClick={onSave}>
                    <Save /> {t('save')}
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
        message={t('are_you_sure_you_want_to_delete_this_preset?')}
      />
      <ConfirmModal
        show={!!missingPlaceholder()}
        close={() => setMissingPlaceholder(false)}
        confirm={() => onSave(ref, true)}
        message={
          <div class="flex flex-col items-center gap-2 text-sm">
            <div>
              <Trans key="missing_gaslight_message">
                Your gaslight is missing a <code>{'{{personality}}'}</code> placeholder. This is
                almost never what you want. It is recommended for your gaslight to contain the
                placeholders:
              </Trans>
              <br /> <code>{t('personality_scenario_and_memory')}</code>
            </div>

            <p>{t('are_you_sure_you_wish_to_proceed?')}</p>
          </div>
        }
      />
    </>
  )
}

export default GenerationPresetsPage

const emptyPreset: AppSchema.GenSettings = {
  ...defaultPresets.basic,
  service: '' as any,
  name: '',
  maxTokens: 150,
}

const EditPreset: Component<{
  show: boolean
  close: () => void
  select: (preset: AppSchema.UserGenPreset) => void
}> = (props) => {
  const [t] = useTransContext()

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
      title={t('load_preset')}
      footer={
        <>
          <Button schema="secondary" onClick={props.close}>
            <X /> {t('cancel')}
          </Button>
          <Button onClick={select}>
            <Edit /> {t('load_preset')}
          </Button>
        </>
      }
    >
      <form ref={ref}>
        <Select
          fieldName="preset"
          label={t('preset')}
          helperText={t('select_a_preset_to_start_editing_message')}
          items={state.presets
            .filter((pre) => pre._id !== params.id)
            .map((pre) => ({ label: pre.name, value: pre._id }))}
        />
      </form>
    </Modal>
  )
}
