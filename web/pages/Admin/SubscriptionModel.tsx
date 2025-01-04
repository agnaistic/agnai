import { A, useNavigate, useParams, useSearchParams } from '@solidjs/router'
import { Edit, Plus, Save, Trash, X } from 'lucide-solid'
import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  Index,
  Match,
  on,
  Show,
  Switch,
} from 'solid-js'
import { defaultPresets, isDefaultPreset } from '../../../common/presets'
import { AppSchema } from '../../../common/types/schema'
import Button from '../../shared/Button'
import Select, { Option } from '../../shared/Select'
import Modal, { ConfirmModal } from '../../shared/Modal'
import PageHeader from '../../shared/PageHeader'
import TextInput from '../../shared/TextInput'
import { setComponentPageTitle } from '../../shared/util'
import { presetStore, settingStore, toastStore } from '../../store'
import Loading from '/web/shared/Loading'
import { Toggle } from '/web/shared/Toggle'
import { Card } from '/web/shared/Card'
import { useRootModal } from '/web/shared/hooks'
import { Page } from '/web/Layout'
import PresetSettings from '/web/shared/PresetSettings'
import { FormLabel } from '/web/shared/FormLabel'
import { getPresetEditor, getSubPresetForm } from '/web/shared/PresetSettings/types'

const emptyPreset: AppSchema.GenSettings = {
  ...defaultPresets.basic,
  ...defaultPresets.agnai,
  name: '',
  temp: 0.85,
  topK: 0,
  topP: 1,
  tailFreeSampling: 1,
  repetitionPenalty: 1,
  repetitionPenaltyRange: 64,
  maxContextLength: 4090,
  maxTokens: 250,
  streamResponse: true,
}

const tokenizers = [
  { label: 'None', value: '' },
  { label: 'Llama', value: 'llama' },
  { label: 'Llama 3', value: 'llama3' },
  { label: 'Turbo', value: 'turbo' },
  { label: 'DaVinci', value: 'davinci' },
  { label: 'Novel Kayra', value: 'novel-modern' },
  { label: 'Novel (Old)', value: 'novel' },
  { label: 'Mistral', value: 'mistral' },
  { label: 'Yi', value: 'yi' },
  { label: 'Cohere', value: 'cohere' },
  { label: 'Qwen2', value: 'qwen2' },
  { label: 'Gemma', value: 'gemma' },
]

export const SubscriptionModel: Component = () => {
  const { updateTitle } = setComponentPageTitle('Subscription Model')
  let ref: any

  const params = useParams()
  const [query] = useSearchParams()

  const nav = useNavigate()
  const [edit, setEdit] = createSignal(false)
  const [deleting, setDeleting] = createSignal(false)
  const [missingPlaceholder, setMissingPlaceholder] = createSignal<boolean>()
  const [replacing, setReplacing] = createSignal(false)
  const [state, setState, hides] = getPresetEditor()

  const onEdit = (preset: AppSchema.SubscriptionModel) => {
    nav(`/admin/subscriptions/${preset._id}`)
  }

  const cfg = settingStore((s) => s.config)

  const presets = presetStore(({ subs, saving }) => ({
    saving,
    subs,
    items: subs.map<Option>((p) => ({ label: p.name, value: p._id })),
    editing: subs.find((pre) => pre._id === query.preset || params.id),
  }))

  createEffect(
    on(
      () => presets.editing,
      (edit) => {
        if (!edit) return
        setState(edit)
      }
    )
  )

  createEffect(async () => {
    if (params.id === 'new') {
      const copySource = query.preset
      if (copySource) {
        updateTitle(`Copy subscription ${copySource}`)
      } else {
        updateTitle(`Create subscription`)
      }

      const template = isDefaultPreset(query.preset)
        ? defaultPresets[query.preset]
        : presets.subs.find((p) => p._id === query.preset)
      const preset = template ? { ...template } : { ...emptyPreset }
      setState({
        ...emptyPreset,
        ...preset,
        _id: '',
        subApiKey: '',
        subDisabled: false,
        allowGuestUsage: false,
      })
      return
    } else if (params.id === 'default') {
      if (!isDefaultPreset(query.preset)) return
      setState({
        ...emptyPreset,
        ...defaultPresets[query.preset],
        _id: '',
        subLevel: 0,
        subModel: '',
        subApiKey: '',
        subDisabled: false,
        levels: [],
      })
      return
    }

    if (params.id && state._id !== params.id) {
      const match = presets.subs.find((p) => p._id === params.id)

      if (!match) {
        presetStore.getSubscriptions()
        return
      }

      setState(match)
      return
    }

    if (params.id && state._id !== params.id) {
      const preset = presets.subs.find((p) => p._id === params.id)
      if (preset) setState(preset)
    }

    if (params.id && state._id) {
      updateTitle(`Edit subscription ${state.name}`)
    }
  })

  const startNew = () => {
    nav('/admin/subscriptions/new')
  }

  const deletePreset = () => {
    presetStore.deleteSubscription(state._id, () => nav('/admin/subscriptions'))
  }

  const onSave = (_ev: Event, force?: boolean) => {
    if (presets.saving) return

    const presetData = getSubPresetForm(state)
    const body: any = { ...presetData, levels: state.levels }

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

    if (state._id) {
      presetStore.updateSubscription(state._id, body as any)
    } else {
      presetStore.createSubscription(body as any, (newPreset) => {
        nav(`/admin/subscriptions/${newPreset._id}`)
      })
    }
    setMissingPlaceholder(false)
  }

  return (
    <Page>
      <PageHeader
        title={
          <A class="link" href="/admin/subscriptions">
            Subscription Model
          </A>
        }
      />
      <Switch>
        <Match when={params.id && params.id !== 'new' && !presets.editing}>
          <Loading />
        </Match>
        <Match when>
          <div class="flex flex-col gap-2 pb-10">
            <div class="flex flex-col gap-4 p-2">
              <form ref={ref} onSubmit={onSave} class="flex flex-col gap-4">
                <div class="flex gap-4">
                  <Show when={presets.subs.length > 1}>
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
                  <div>ID: {state._id || 'New Subscription'}</div>
                  <TextInput fieldName="id" value={state._id || ''} disabled class="hidden" />
                  <TextInput
                    fieldName="name"
                    label="Name"
                    helperText="Name of the model"
                    placeholder="E.g. Mythomax"
                    value={state.name}
                    onChange={(ev) => setState('name', ev.currentTarget.value)}
                    required
                    parentClass="mb-2"
                  />

                  <TextInput
                    fieldName="description"
                    label="Description"
                    helperText="A short description of your model"
                    placeholder="E.g. LLama 3.1 8B fine-tune"
                    value={state.description}
                    onChange={(ev) => setState('description', ev.currentTarget.value)}
                    required
                    parentClass="mb-2"
                  />

                  <TextInput
                    fieldName="subApiKey"
                    label="API Key"
                    helperText="(Optional) API Key for your AI service if applicable."
                    placeholder={state.subApiKeySet ? 'API Key is set' : 'API Key is not set'}
                    value={state.subApiKey}
                    onChange={(ev) => setState('subApiKey', ev.currentTarget.value)}
                    required
                    parentClass="mb-2"
                  />

                  <Card>
                    <TextInput
                      type="number"
                      fieldName="subLevel"
                      label="Subscription Level"
                      helperText='Anything above -1 requires a "subscription". All users by default are -1.'
                      placeholder="0"
                      value={state.subLevel ?? 0}
                      onChange={(ev) => setState('subLevel', +ev.currentTarget.value)}
                      required
                    />

                    <Levels
                      levels={state.levels || []}
                      update={(levels) => setState('levels', levels)}
                    />
                  </Card>

                  <Card hide={state.service !== 'agnaistic'} class="mt-4">
                    <TextInput
                      fieldName="subModel"
                      label="Model"
                      helperText="Agnaistic service only"
                      placeholder=""
                      value={state.subModel}
                      onChange={(ev) => setState('subModel', ev.currentTarget.value)}
                      required
                      parentClass="mb-2"
                    />

                    <TextInput
                      fieldName="subServiceUrl"
                      label="Model Service URL"
                      helperText="Agnaistic service only"
                      placeholder="https://..."
                      value={state.subServiceUrl}
                      onChange={(ev) => setState('subServiceUrl', ev.currentTarget.value)}
                      required
                      parentClass="mb-2"
                    />

                    <Toggle
                      fieldName="jsonSchemaCapable"
                      label="JSON Schema Capable"
                      value={state.jsonSchemaCapable}
                      onChange={(ev) => setState('jsonSchemaCapable', ev)}
                    />

                    <Toggle
                      fieldName="guidanceCapable"
                      label="Guidance Capable"
                      helperText="Agnaistic service only"
                      value={state.guidanceCapable}
                      onChange={(ev) => setState('guidanceCapable', ev)}
                    />
                  </Card>

                  <Card class="mt-4 flex flex-col gap-2">
                    <Toggle
                      fieldName="subDisabled"
                      label="Subscription Disabled"
                      helperText="Disable the use of this subscription"
                      value={state.subDisabled ?? false}
                      onChange={(ev) => setState('subDisabled', ev)}
                    />
                    <Toggle
                      fieldName="isDefaultSub"
                      label="Is Default Subscription"
                      helperText="Is chosen as fallback when no subscription is provided with a request"
                      value={state.isDefaultSub ?? false}
                      onChange={(ev) => setState('isDefaultSub', ev)}
                    />

                    <Toggle
                      fieldName="allowGuestUsage"
                      label="Allow Guest Usage"
                      helperText={
                        'Typically for default subscriptions. Require users to sign in to use this subscription.'
                      }
                      value={state.allowGuestUsage === false ? false : true}
                      onChange={(ev) => setState('allowGuestUsage', ev)}
                    />
                  </Card>
                </div>

                <Select
                  fieldName="tokenizer"
                  items={tokenizers}
                  value={state.tokenizer}
                  label="Tokenizer Override"
                  helperText="Optional. For use with custom models."
                  onChange={(ev) => setState('tokenizer', ev.value)}
                />

                <PresetSettings
                  disabled={params.id === 'default'}
                  store={state}
                  setter={setState}
                  hides={hides}
                  noSave
                />
                <div class="flex flex-row justify-end">
                  <Button disabled={presets.saving} onClick={onSave}>
                    <Save /> Save
                  </Button>
                </div>
              </form>
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
    </Page>
  )
}

export default SubscriptionModel

const SupercedeModal: Component<{ show: boolean; close: () => void }> = (props) => {
  let form: any

  const params = useParams()
  const nav = useNavigate()

  const [replaceId, setReplaceId] = createSignal('')

  const state = presetStore((s) => ({ subs: s.subs }))
  const replacements = createMemo(() =>
    state.subs
      .filter((sub) => sub._id !== params.id && !sub.subDisabled)
      .map((sub) => ({ label: `[${sub.subLevel}] ${sub.name}`, value: sub._id }))
  )

  const onSubmit = () => {
    const subscriptionId = params.id

    if (!replaceId()) {
      toastStore.warn('Replacement ID not set')
      return
    }

    presetStore.replaceSubscription(subscriptionId, replaceId(), () => {
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
            onChange={(ev) => setReplaceId(ev.value)}
          />
        </form>
      </Modal>
    ),
  })

  return null
}

const Levels: Component<{
  levels: AppSchema.SubscriptionModelLevel[]
  update: (levels: AppSchema.SubscriptionModelLevel[]) => void
}> = (props) => {
  const change = (index: number, update: Partial<AppSchema.SubscriptionModelLevel>) => {
    const next = props.levels.map((l, i) => {
      if (i !== index) return l
      return { ...l, ...update }
    })

    props.update(next)
  }

  const add = () => {
    const next = props.levels.concat({
      level: 0,
      maxTokens: 400,
      maxContextLength: 8192,
    })
    props.update(next)
  }

  const remove = (i: number) => {
    const next = props.levels.slice()
    next.splice(i, 1)
    props.update(next)
  }

  return (
    <>
      <div class="flex flex-col gap-2">
        <FormLabel
          label={
            <div class="flex items-center gap-2">
              Levels{' '}
              <Button size="sm" onClick={add}>
                <Plus size={12} />
              </Button>
            </div>
          }
        />
      </div>

      <Index each={props.levels}>
        {(level, i) => (
          <div class="flex gap-2">
            <TextInput
              fieldName={`level.threshold.${i}`}
              type="number"
              helperText="Sub Level"
              value={level().level}
              onChange={(ev) => change(i, { level: +ev.currentTarget.value })}
            />

            <TextInput
              fieldName={`level.maxtokens.${i}`}
              type="number"
              helperText="Tokens"
              value={level().maxTokens}
              onChange={(ev) => change(i, { maxTokens: +ev.currentTarget.value })}
            />

            <TextInput
              fieldName={`level.maxcontext.${i}`}
              type="number"
              helperText="Context"
              value={level().maxContextLength}
              onChange={(ev) => change(i, { maxContextLength: +ev.currentTarget.value })}
            />

            <Button schema="red" onClick={() => remove(i)}>
              <Trash size={16} />
            </Button>
          </div>
        )}
      </Index>
    </>
  )
}

const EditPreset: Component<{
  show: boolean
  close: () => void
  select: (preset: AppSchema.SubscriptionModel) => void
}> = (props) => {
  const params = useParams()
  const state = presetStore()
  const [id, setId] = createSignal('')

  const select = () => {
    const preset = state.subs.find((preset) => preset._id === id())
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
      <form>
        <Select
          label="Preset"
          helperText="Select a preset to start editing. If you are currently editing a preset, it won't be in the list."
          value={id()}
          onChange={(ev) => setId(ev.value)}
          items={state.subs
            .filter((pre) => pre._id !== params.id)
            .map((pre) => ({ label: pre.name, value: pre._id }))}
        />
      </form>
    </Modal>
  )
}
