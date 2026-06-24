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
  onMount,
  Show,
  Switch,
} from 'solid-js'
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
import { Page } from '/web/Layout'
import PresetSettings from '/web/shared/PresetSettings'
import { FormLabel } from '/web/shared/FormLabel'
import { defaultPresets, isDefaultPreset, presetDefaults } from '/common/default-preset'
import { getSubPresetForm, usePresetContext } from '/web/store/preset-context'

const emptyPreset: AppSchema.GenSettings = {
  ...presetDefaults,
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
  { label: '无', value: '' },
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
  { label: 'Qwen3', value: 'qwen3' },
  { label: 'Gemma', value: 'gemma' },
]

export const SubscriptionModel: Component = () => {
  const { updateTitle } = setComponentPageTitle('订阅模型')
  let ref: any

  const params = useParams()
  const [query] = useSearchParams()

  const nav = useNavigate()
  const [edit, setEdit] = createSignal(false)
  const [deleting, setDeleting] = createSignal(false)
  const [replacing, setReplacing] = createSignal(false)
  const [state, setters] = usePresetContext({ anonymous: true })

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
        setters.setState(edit)
      }
    )
  )

  onMount(async () => {
    if (params.id === 'new') {
      const copySource = query.preset
      if (copySource) {
        updateTitle(`复制订阅 ${copySource}`)
      } else {
        updateTitle(`创建订阅`)
      }

      const importing = presets.subs.find((p) => p._id === query.preset)
      setters.clear()
      if (importing) {
        setters.setState({ ...importing, _id: '' })
      }
      return
    } else if (params.id === 'default') {
      if (!isDefaultPreset(query.preset)) return
      setters.setState({
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

    if (params.id && state.current._id !== params.id) {
      const match = presets.subs.find((p) => p._id === params.id)

      if (!match) {
        presetStore.getSubscriptions()
        return
      }

      setters.setState(match)
      return
    }

    if (params.id && state.current._id !== params.id) {
      const preset = presets.subs.find((p) => p._id === params.id)
      if (preset) setters.setState(preset)
    }

    if (params.id && state.current._id) {
      updateTitle(`编辑订阅 ${state.current.name}`)
    }
  })

  const startNew = () => {
    nav('/admin/subscriptions/new')
  }

  const deletePreset = () => {
    presetStore.deleteSubscription(state.current._id, () => nav('/admin/subscriptions'))
  }

  const onSave = (_ev: Event, force?: boolean) => {
    if (presets.saving) return

    const presetData = getSubPresetForm(state.current)
    const body: any = { ...presetData, levels: state.current.levels }

    body.thirdPartyFormat = body.thirdPartyFormat || (null as any)

    if (!body.service) {
      toastStore.error(`保存前必须选择一个 AI 服务`)
      return
    }

    if (body.openRouterModel) {
      const actual = cfg.openRouter.models.find((or) => or.id === body.openRouterModel)
      body.openRouterModel = actual || undefined
    }

    if (state.current._id) {
      presetStore.updateSubscription(state.current._id, body as any)
    } else {
      presetStore.createSubscription(body as any, (newPreset) => {
        nav(`/admin/subscriptions/${newPreset._id}`)
      })
    }
  }

  return (
    <Page>
      <PageHeader
        title={
          <A class="link" href="/admin/subscriptions">
            订阅模型
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
                    <Button onClick={() => setEdit(true)}>加载预设</Button>
                  </Show>
                  <Button onClick={startNew}>
                    <Plus />
                    新订阅
                  </Button>
                  <Button onClick={() => setReplacing(true)} schema="red">
                    替换/取代
                  </Button>
                </div>
                <div class="flex flex-col">
                  <div>ID: {state.current._id || '新订阅'}</div>
                  <TextInput
                    fieldName="id"
                    value={state.current._id || ''}
                    disabled
                    class="hidden"
                  />
                  <TextInput
                    fieldName="name"
                    label="名称"
                    helperText="模型名称"
                    placeholder="例如：Mythomax"
                    value={state.current.name}
                    onChange={(ev) => setters.setState({ name: ev.currentTarget.value })}
                    required
                    parentClass="mb-2"
                  />

                  <TextInput
                    fieldName="description"
                    label="描述"
                    helperText="模型的简短描述"
                    placeholder="例如：Llama 3.1 8B 微调版"
                    value={state.current.description}
                    onChange={(ev) => setters.setState({ description: ev.currentTarget.value })}
                    required
                    parentClass="mb-2"
                  />

                  <TextInput
                    fieldName="subApiKey"
                    label="API 密钥"
                    helperText="可选：如果 AI 服务需要，请填写 API 密钥。"
                    placeholder={
                      state.current.subApiKeySet ? '已设置 API 密钥' : '未设置 API 密钥'
                    }
                    value={state.current.subApiKey}
                    onChange={(ev) => setters.setState({ subApiKey: ev.currentTarget.value })}
                    required
                    parentClass="mb-2"
                  />

                  <Card>
                    <TextInput
                      type="number"
                      fieldName="subLevel"
                      label="订阅等级"
                      helperText='大于 -1 的值都需要“订阅”。所有用户默认都是 -1。'
                      placeholder="0"
                      value={state.current.subLevel ?? 0}
                      onChange={(ev) => setters.setState({ subLevel: +ev.currentTarget.value })}
                      required
                    />

                    <Levels
                      levels={state.current.levels || []}
                      update={(levels) => setters.setState({ levels: levels })}
                    />
                  </Card>

                  <Card class="mt-4">
                    <TextInput
                      fieldName="subModel"
                      label="模型"
                      helperText="仅 Agnaistic 服务"
                      placeholder=""
                      value={state.current.subModel}
                      onChange={(ev) => setters.setState({ subModel: ev.currentTarget.value })}
                      required
                      parentClass="mb-2"
                    />

                    <TextInput
                      fieldName="subServiceUrl"
                      label="模型服务 URL"
                      helperText="仅 Agnaistic 服务"
                      placeholder="https://..."
                      value={state.current.subServiceUrl}
                      onChange={(ev) => setters.setState({ subServiceUrl: ev.currentTarget.value })}
                      required
                      parentClass="mb-2"
                    />

                    <Toggle
                      fieldName="guidanceCapable"
                      label="支持 Guidance"
                      helperText="仅 Agnaistic 服务"
                      value={state.current.guidanceCapable}
                      onChange={(ev) => setters.setState({ guidanceCapable: ev })}
                    />
                  </Card>

                  <Card class="mt-4 flex flex-col gap-2">
                    <Toggle
                      fieldName="subDisabled"
                      label="禁用订阅"
                      helperText="禁止使用这个订阅"
                      value={state.current.subDisabled ?? false}
                      onChange={(ev) => setters.setState('subDisabled', ev)}
                    />
                    <Toggle
                      fieldName="isDefaultSub"
                      label="设为默认订阅"
                      helperText="请求未指定订阅时作为备用项"
                      value={state.current.isDefaultSub ?? false}
                      onChange={(ev) => setters.setState('isDefaultSub', ev)}
                    />

                    <Toggle
                      fieldName="jsonSchemaCapable"
                      label="支持 JSON Schema（结构化响应）"
                      value={state.current.jsonSchemaCapable}
                      onChange={(ev) => setters.setState('jsonSchemaCapable', ev)}
                    />

                    <Toggle
                      fieldName="subVisionModel"
                      label="视觉模型"
                      helperText="仅 Agnaistic 服务"
                      value={state.current.subVisionModel}
                      onChange={(ev) => setters.setState('subVisionModel', ev)}
                    />

                    <Toggle
                      fieldName="allowGuestUsage"
                      label="允许访客使用"
                      helperText={
                        '通常用于默认订阅。关闭后需要用户登录才能使用。'
                      }
                      value={state.current.allowGuestUsage === false ? false : true}
                      onChange={(ev) => setters.setState('allowGuestUsage', ev)}
                    />
                  </Card>
                </div>

                <Select
                  fieldName="tokenizer"
                  items={tokenizers}
                  value={state.current.tokenizer}
                  label="覆盖 Tokenizer"
                  helperText="可选。用于自定义模型。"
                  onChange={(ev) => setters.setState('tokenizer', ev.value)}
                />

                <PresetSettings
                  state={state.current}
                  setters={setters}
                  disabled={params.id === 'default'}
                  noSave
                  noModel
                />
                <div class="flex flex-row justify-end">
                  <Show when={state.current._id}>
                    <Button disabled={presets.saving} onClick={onSave}>
                      <Save /> 保存
                    </Button>
                  </Show>
                  <Show when={!state.current._id}>
                    <Button disabled={presets.saving} onClick={onSave}>
                      <Save /> 创建
                    </Button>
                  </Show>
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
        message="确定要删除这个预设吗？"
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
      toastStore.warn('未设置替换订阅 ID')
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
        取消
      </Button>
      <Button schema="green" onClick={onSubmit}>
        替换
      </Button>
    </>
  )

  return (
    <Modal show={props.show} close={props.close} title="替换订阅" footer={Footer}>
      <form ref={form}>
        <Select
          items={replacements()}
          fieldName="replacementId"
          label="替换为订阅"
          helperText="将取代当前订阅的订阅"
          onChange={(ev) => setReplaceId(ev.value)}
        />
      </form>
    </Modal>
  )
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
              层级{' '}
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
              helperText="订阅等级"
              value={level().level}
              onChange={(ev) => change(i, { level: +ev.currentTarget.value })}
            />

            <TextInput
              fieldName={`level.maxtokens.${i}`}
              type="number"
              helperText="Token 数"
              value={level().maxTokens}
              onChange={(ev) => change(i, { maxTokens: +ev.currentTarget.value })}
            />

            <TextInput
              fieldName={`level.maxcontext.${i}`}
              type="number"
              helperText="上下文"
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
  const state = presetStore((s) => ({ subs: s.subs }))
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
      title="加载预设"
      footer={
        <>
          <Button schema="secondary" onClick={props.close}>
            <X /> 取消
          </Button>
          <Button onClick={select}>
            <Edit /> 加载预设
          </Button>
        </>
      }
    >
      <form>
        <Select
          label="预设"
          helperText="选择一个预设开始编辑。当前正在编辑的预设不会出现在列表中。"
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
