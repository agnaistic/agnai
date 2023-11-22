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

const tokenizers = [
  { label: 'None', value: '' },
  { label: 'LlamaV1', value: 'llama' },
  { label: 'Turbo', value: 'turbo' },
  { label: 'DaVinci', value: 'davinci' },
  { label: 'Novel Kayra', value: 'novel-modern' },
  { label: 'Novel (Old)', value: 'novel' },
]

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
        updateTitle(`Copy subscription ${copySource}`)
      } else {
        updateTitle(`Create subscription`)
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
      updateTitle(`Edit subscription ${subscription.name}`)
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
    } as const

    const presetData = getPresetFormData(ref)
    const subData = getStrictForm(ref, validator)
    const body = { ...presetData, ...subData }

    body.thirdPartyFormat = body.thirdPartyFormat || (null as any)

    if (!body.service) {
      toastStore.error(`You must select an AI service before saving`)
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
            Subscription
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
                      <Button onClick={() => setEdit(true)}>Load Preset</Button>
                    </Show>
                    <Button onClick={startNew}>
                      <Plus />
                      New Subscription
                    </Button>
                    <Button onClick={() => setReplacing(true)} schema="red">
                      Replace/Supercede
                    </Button>
                  </div>
                  <div class="flex flex-col">
                    <div>ID: {editing()?._id || 'New Subscription'}</div>
                    <TextInput
                      fieldName="id"
                      value={editing()?._id || ''}
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

                    <TextInput
                      fieldName="subApiKey"
                      label="API Key"
                      helperText="(Optional) API Key for your AI service if applicable."
                      placeholder={
                        editing()?.subApiKeySet ? 'API Key is set' : 'API Key is not set'
                      }
                      type="password"
                      value={editing()?.subApiKey || ''}
                      required
                      parentClass="mb-2"
                    />

                    <TextInput
                      type="number"
                      fieldName="subLevel"
                      label="Subscription Level"
                      helperText='Anything above -1 requires a "subscription". All users by default are -1.'
                      placeholder="0"
                      value={editing()?.subLevel ?? 0}
                      required
                    />

                    <Card hide={service() !== 'agnaistic'} class="mt-4">
                      <TextInput
                        fieldName="subModel"
                        label="Model"
                        helperText="Agnaistic service only"
                        placeholder=""
                        value={editing()?.subModel}
                        required
                        parentClass="mb-2"
                      />

                      <TextInput
                        fieldName="subServiceUrl"
                        label="Model Service URL"
                        helperText="Agnaistic service only"
                        placeholder="https://..."
                        value={editing()?.subServiceUrl}
                        required
                        parentClass="mb-2"
                      />
                    </Card>

                    <Card class="mt-4 flex flex-col gap-2">
                      <Toggle
                        fieldName="subDisabled"
                        label="Subscription Disabled"
                        helperText="Disable the use of this subscription"
                        value={editing()?.subDisabled ?? false}
                      />
                      <Toggle
                        fieldName="isDefaultSub"
                        label="Is Default Subscription"
                        helperText="Is chosen as fallback when no subscription is provided with a request"
                        value={editing()?.isDefaultSub ?? false}
                      />

                      <Toggle
                        fieldName="allowGuestUsage"
                        label="Allow Guest Usage"
                        helperText={
                          'Typically for default subscriptions. Require users to sign in to use this subscription.'
                        }
                        value={editing()?.allowGuestUsage === false ? false : true}
                      />
                    </Card>
                  </div>

                  <Select
                    fieldName="tokenizer"
                    items={tokenizers}
                    value={editing()?.tokenizer}
                    label="Tokenizer Override"
                    helperText="Optional. For use with custom models."
                  />

                  <GenerationSettings
                    inherit={editing()}
                    disabled={params.id === 'default'}
                    onService={setService}
                    onSave={() => {}}
                  />
                  <div class="flex flex-row justify-end">
                    <Button disabled={state.saving} onClick={onSave}>
                      <Save /> Save
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

const SupercedeModal: Component<{ show: boolean; close: () => void }> = (props) => {
  let form: any

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
        Cancel
      </Button>
      <Button schema="green" onClick={onSubmit}>
        Replace
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
            label="Replacement Subscription"
            helperText="The subscription that will supercede the current subscription"
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
