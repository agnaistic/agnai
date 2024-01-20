import { A, useNavigate, useParams, useSearchParams } from '@solidjs/router'
import { Edit, Plus, Save, X } from 'lucide-solid'
import { Component, createEffect, createMemo, createSignal, Match, Show, Switch } from 'solid-js'
import { defaultPresets, isDefaultPreset } from '../../../common/presets'
import { AppSchema } from '../../../common/types/schema'
import Button from '../../shared/Button'
import Select, { Option } from '../../shared/Select'
import GenerationSettings, {
  getPresetFormData,
  getRegisteredSettings,
} from '../../shared/GenerationSettings'
import Modal, { ConfirmModal } from '../../shared/Modal'
import PageHeader from '../../shared/PageHeader'
import TextInput from '../../shared/TextInput'
import { getStrictForm, setComponentPageTitle } from '../../shared/util'
import { presetStore, settingStore, toastStore } from '../../store'
import { AIAdapter, AI_ADAPTERS } from '../../../common/adapters'
import Loading from '/web/shared/Loading'
import { Toggle } from '/web/shared/Toggle'
import { Card } from '/web/shared/Card'
import { useRootModal } from '/web/shared/hooks'
import { Trans, useTransContext } from '@mbarzda/solid-i18next'

const tokenizers = [
  { label: 'None', value: '' },
  { label: 'Llama', value: 'llama' },
  { label: 'Turbo', value: 'turbo' },
  { label: 'DaVinci', value: 'davinci' },
  { label: 'Novel Kayra', value: 'novel-modern' },
  { label: 'Novel (Old)', value: 'novel' },
  { label: 'Mistral', value: 'mistral' },
]

export const Subscription: Component = () => {
  const [t] = useTransContext()

  const { updateTitle } = setComponentPageTitle(t('subscription'))
  let ref: any

  const params = useParams()
  const [query] = useSearchParams()

  const nav = useNavigate()
  const [edit, setEdit] = createSignal(false)
  const [editing, setEditing] = createSignal<AppSchema.SubscriptionPreset>()
  const [deleting, setDeleting] = createSignal(false)
  const [missingPlaceholder, setMissingPlaceholder] = createSignal<boolean>()
  const [service, setService] = createSignal<AIAdapter>()
  const [replacing, setReplacing] = createSignal(false)

  const onEdit = (preset: AppSchema.SubscriptionPreset) => {
    nav(`/admin/subscriptions/${preset._id}`)
  }

  const cfg = settingStore((s) => s.config)

  const state = presetStore(({ subs, saving }) => ({
    saving,
    subs,
    items: subs.map<Option>((p) => ({ label: p.name, value: p._id })),
    editing: subs.find((pre) => pre._id === query.preset || params.id),
  }))

  createEffect(() => {
    const inherit = editing()
    const svc = service()

    if (!inherit?.service || !!svc) return
    setService(inherit.service)
  })

  createEffect(async () => {
    if (params.id === 'new') {
      const copySource = query.preset
      if (copySource) {
        updateTitle(t('copy_subscription_x', { source: copySource }))
      } else {
        updateTitle(t('create_subscription'))
      }
      setEditing()
      await Promise.resolve()
      const template = isDefaultPreset(query.preset)
        ? defaultPresets[query.preset]
        : state.subs.find((p) => p._id === query.preset)
      const preset = template ? { ...template } : { ...emptyPreset }
      setEditing({
        ...emptyPreset,
        ...preset,
        _id: '',
        kind: 'subscription-setting',
        subLevel: 0,
        subModel: '',
        subApiKey: '',
        subDisabled: false,
        allowGuestUsage: false,
      })
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
        subModel: '',
        subApiKey: '',
        subDisabled: false,
        kind: 'subscription-setting',
      })
      return
    }

    const subscription = editing()

    if (params.id && !subscription) {
      const match = state.subs.find((p) => p._id === params.id)

      if (!match) {
        presetStore.getSubscriptions()
      }

      setEditing(match)
      return
    }

    if (params.id && subscription && subscription._id !== params.id) {
      setEditing()
      await Promise.resolve()
      const preset = state.subs.find((p) => p._id === params.id)
      setEditing(preset)
    }

    if (params.id && subscription) {
      updateTitle(t('edit_subscription_x', { name: subscription.name }))
    }
  })

  const startNew = () => {
    nav('/admin/subscriptions/new')
  }

  const deletePreset = () => {
    const preset = editing()
    if (!preset) return

    presetStore.deleteSubscription(preset._id, () => nav('/admin/subscriptions'))
  }

  const onSave = (_ev: Event, force?: boolean) => {
    if (state.saving) return
    const validator = {
      service: ['', ...AI_ADAPTERS],
      subLevel: 'number',
      subModel: 'string',
      subServiceUrl: 'string',
      subDisabled: 'boolean',
      subApiKey: 'string',
      isDefaultSub: 'boolean',
      thirdPartyFormat: 'string?',
      allowGuestUsage: 'boolean',
      tokenizer: 'string?',
      guidanceCapable: 'boolean?',
    } as const

    const presetData = getPresetFormData(ref)
    const subData = getStrictForm(ref, validator)
    const body = { ...presetData, ...subData }

    body.thirdPartyFormat = body.thirdPartyFormat || (null as any)

    if (!body.service) {
      toastStore.error(t('you_must_select_an_ai_service_before_saving'))
      return
    }

    if (body.openRouterModel) {
      const actual = cfg.openRouter.models.find((or) => or.id === body.openRouterModel)
      body.openRouterModel = actual || undefined
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
      presetStore.updateSubscription(prev._id, body as any)
    } else {
      presetStore.createSubscription(body as any, (newPreset) => {
        nav(`/admin/subscriptions/${newPreset._id}`)
      })
    }
    setMissingPlaceholder(false)
  }

  return (
    <>
      <PageHeader
        title={
          <A class="link" href="/admin/subscriptions">
            {t('subscription')}
          </A>
        }
      />
      <Switch>
        <Match when={params.id && params.id !== 'new' && !state.editing}>
          <Loading />
        </Match>
        <Match when>
          <div class="flex flex-col gap-2 pb-10">
            <div class="flex flex-col gap-4 p-2">
              <Show when={editing()}>
                <form ref={ref} onSubmit={onSave} class="flex flex-col gap-4">
                  <div class="flex gap-4">
                    <Show when={state.subs.length > 1}>
                      <Button onClick={() => setEdit(true)}>{t('load_preset')}</Button>
                    </Show>
                    <Button onClick={startNew}>
                      <Plus />
                      {t('new_subscription')}
                    </Button>
                    <Button onClick={() => setReplacing(true)} schema="red">
                      {t('replace_or_supercede')}
                    </Button>
                  </div>
                  <div class="flex flex-col">
                    <div>ID: {editing()?._id || t('new_subscription')}</div>
                    <TextInput
                      fieldName="id"
                      value={editing()?._id || ''}
                      disabled
                      class="hidden"
                    />
                    <TextInput
                      fieldName="name"
                      label={t('name')}
                      helperText={t('a_name_or_short_description_for_your_preset')}
                      placeholder={t('e_g_premium_+')}
                      value={editing()?.name}
                      required
                      parentClass="mb-2"
                    />

                    <TextInput
                      fieldName="subApiKey"
                      label={t('api_key')}
                      helperText={t('optional_api_key_for_your_ai_service')}
                      placeholder={
                        editing()?.subApiKeySet ? t('api_key_is_set') : t('api_key_is_not_set')
                      }
                      type="password"
                      value={editing()?.subApiKey || ''}
                      required
                      parentClass="mb-2"
                    />

                    <TextInput
                      type="number"
                      fieldName="subLevel"
                      label={t('subscription_level')}
                      helperText={t('subscription_level_message')}
                      placeholder="0"
                      value={editing()?.subLevel ?? 0}
                      required
                    />

                    <Card hide={service() !== 'agnaistic'} class="mt-4">
                      <TextInput
                        fieldName="subModel"
                        label={t('model')}
                        helperText={t('agnaistic_service_only')}
                        placeholder=""
                        value={editing()?.subModel}
                        required
                        parentClass="mb-2"
                      />

                      <TextInput
                        fieldName="subServiceUrl"
                        label={t('model_service_url')}
                        helperText={t('agnaistic_service_only')}
                        placeholder={t('https...')}
                        value={editing()?.subServiceUrl}
                        required
                        parentClass="mb-2"
                      />

                      <Toggle
                        fieldName="guidanceCapable"
                        label="Guidance Capable"
                        helperText="Agnaistic service only"
                        value={editing()?.guidanceCapable}
                      />
                    </Card>

                    <Card class="mt-4 flex flex-col gap-2">
                      <Toggle
                        fieldName="subDisabled"
                        label={t('subscription_disabled')}
                        helperText={t('disable_the_use_of_this_subscription')}
                        value={editing()?.subDisabled ?? false}
                      />
                      <Toggle
                        fieldName="isDefaultSub"
                        label={t('is_default_subscription')}
                        helperText={t('is_default_subscription_message')}
                        value={editing()?.isDefaultSub ?? false}
                      />

                      <Toggle
                        fieldName="allowGuestUsage"
                        label={t('allow_guest_usage')}
                        helperText={t('allow_guest_usage_message')}
                        value={editing()?.allowGuestUsage === false ? false : true}
                      />
                    </Card>
                  </div>

                  <Select
                    fieldName="tokenizer"
                    items={tokenizers}
                    value={editing()?.tokenizer}
                    label={t('tokenizer_override')}
                    helperText={t('optional_for_use_with_custom_models')}
                  />

                  <GenerationSettings
                    inherit={editing()}
                    disabled={params.id === 'default'}
                    onService={setService}
                    onSave={() => {}}
                  />
                  <div class="flex flex-row justify-end">
                    <Button disabled={state.saving} onClick={onSave}>
                      <Save /> {t('save')}
                    </Button>
                  </div>
                </form>
              </Show>
            </div>
          </div>
        </Match>
      </Switch>

      <EditPreset show={edit()} close={() => setEdit(false)} select={onEdit} />
      <SupercedeModal show={replacing()} close={() => setReplacing(false)} />
      <ConfirmModal
        show={deleting()}
        close={() => setDeleting(false)}
        confirm={deletePreset}
        message={t('are_you_sure_you_want_to_delete_this_preset')}
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

export default Subscription

const SupercedeModal: Component<{ show: boolean; close: () => void }> = (props) => {
  let form: any

  const [t] = useTransContext()

  const params = useParams()
  const nav = useNavigate()

  const state = presetStore((s) => ({ subs: s.subs }))
  const replacements = createMemo(() =>
    state.subs
      .filter((sub) => sub._id !== params.id)
      .map((sub) => ({ label: `[${sub.subLevel}] ${sub.name}`, value: sub._id }))
  )

  const onSubmit = () => {
    const subscriptionId = params.id
    const { replacementId } = getStrictForm(form, { replacementId: 'string' })

    presetStore.replaceSubscription(subscriptionId, replacementId, () => {
      props.close()
      nav(`/admin/subscriptions`)
    })
  }

  const Footer = (
    <>
      <Button schema="secondary" onClick={props.close}>
        {t('cancel')}
      </Button>
      <Button schema="green" onClick={onSubmit}>
        {t('replace')}
      </Button>
    </>
  )

  useRootModal({
    id: 'replace-subscription',
    element: (
      <Modal show={props.show} close={props.close} title="Replace Subscription" footer={Footer}>
        <form ref={form}>
          <Select
            items={replacements()}
            fieldName="replacementId"
            label={t('replacement_subscription')}
            helperText={t('replacement_subscription_message')}
          />
        </form>
      </Modal>
    ),
  })

  return null
}

const emptyPreset: AppSchema.GenSettings = {
  ...defaultPresets.basic,
  ...defaultPresets.agnai,
  name: '',
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
  const [t] = useTransContext()

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
