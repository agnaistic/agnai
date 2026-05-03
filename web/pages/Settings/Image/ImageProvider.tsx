import {
  Accessor,
  Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  Index,
  Match,
  on,
  onMount,
  Setter,
  Show,
  Switch,
} from 'solid-js'
import { pageStore, settingStore, userStore } from '/web/store'
import Select from '/web/shared/Select'
import { ImageContext } from './image-context'
import { ImageProviderLora, ImageProviderSettings } from '/common/types/image-schema'
import { createStore, SetStoreFunction } from 'solid-js/store'
import {
  NOVEL_IMAGE_MODEL,
  NOVEL_SAMPLER_REV,
  SD_SAMPLER,
  SD_SAMPLER_REV,
  SWARM_SAMPLER,
  SWARM_SAMPLER_REV,
} from '/common/image'
import { Toggle } from '/web/shared/Toggle'
import { createEmitter } from '/web/shared/util'
import { imageApi } from '/web/store/data/image'
import { CustomOption, CustomSelect } from '/web/shared/CustomSelect'
import TextInput from '/web/shared/TextInput'
import Button, { ToggleButton } from '/web/shared/Button'
import { Info, RefreshCcw, SaveIcon, X } from 'lucide-solid'
import { useProviderList } from '../Provider/hooks'
import { Card, Pill } from '/web/shared/Card'
import { InlineRangeInput } from '/web/shared/RangeInput'
import Modal from '/web/shared/Modal'

export const SelectImageProvider: Component<{ ctx: ImageContext }> = (props) => {
  const state = userStore((s) => ({ providers: s.user?.imageProviders || [] }))

  const [editPrv, setEditPrv] = createSignal<ImageProviderSettings | undefined>()
  const [current, setCurrent] = createSignal({ id: '', model: '' })

  createEffect(
    on(
      () => props.ctx.store.imageProviderId,
      () => {
        if (!props.ctx.store.imageProviderId) {
          setCurrent({ id: '', model: '' })
          return
        }

        const match = state.providers.find((s) => s._id === props.ctx.store.imageProviderId)

        if (match?.type !== 'openai') {
          setCurrent({ id: '', model: '' })
          return
        }

        setCurrent({ id: match?._id || '', model: match?.model || '', prv: match })
      }
    )
  )

  const providers = createMemo(() => {
    const list = state.providers.map((prv) => {
      let name = ''
      if (!prv.name) {
        try {
          name = new URL(prv.url).host
        } catch (ex) {
          name = prv.type + ': unnamed'
        }
      } else {
        name = prv.name
      }

      return {
        label: name,
        value: prv._id || '',
        prv,
      }
    })

    list.unshift({ label: 'None Set', value: '', prv: null as any })
    return list
  })

  const newProvider = () => {
    setEditPrv({
      _id: '',
      name: '',
      type: 'agnai',
      url: '',
      sampler: '',
      model: '',
    })
  }

  const saveModel = () => {
    const curr = current()
    if (!curr.id) return

    const match = state.providers.find((p) => p._id === curr.id)
    if (!match) return

    const payload = { ...match, model: curr.model }
    userStore.upsertImageProvider(payload)
  }

  return (
    <>
      <div class="flex w-full flex-col gap-2">
        <div class="flex w-full items-end gap-2">
          <Select
            label={
              <div class="mb-1 flex items-center gap-1">
                Image Provider{' '}
                <Button size="sm" onClick={newProvider}>
                  New +
                </Button>
              </div>
            }
            items={providers()}
            value={props.ctx.store.imageProviderId || ''}
            onChange={(ev) => props.ctx.update('imageProviderId', ev.value)}
          />
          <Button
            disabled={!props.ctx.store.imageProviderId}
            onClick={() => {
              if (!props.ctx.store.imageProviderId) return
              const match = state.providers.find(
                (prv) => prv._id === props.ctx.store.imageProviderId
              )

              if (!match) return
              setEditPrv(match)
            }}
          >
            Edit
          </Button>
        </div>

        <Show when={current().id}>
          <div class="flex w-full items-center gap-1">
            <TextInput
              parentClass="w-full"
              class="w-full"
              prelabel="Model ID"
              value={current().model}
              onChange={(ev) =>
                setCurrent((prev) => ({ id: prev.id, model: ev.currentTarget.value }))
              }
            />
            <Button class="!w-fit" onClick={saveModel}>
              <SaveIcon size={24} />
            </Button>
          </div>
        </Show>
      </div>

      <Show when={editPrv()}>
        <EditImageProvider provider={editPrv()!} close={() => setEditPrv()} ctx={props.ctx} />
      </Show>
    </>
  )
}

export const EditImageProvider: Component<{
  provider: ImageProviderSettings
  ctx: ImageContext
  close: () => void
}> = (props) => {
  const [store, setStore] = createStore({ ...props.provider })

  const save = async () => {
    const payload = { ...store }
    if (!payload._id) {
      payload._id = ''
    }

    if (!payload.url) {
      payload.url = ''
    }

    await userStore.upsertImageProvider(payload, props.close)
  }

  return (
    <Modal
      show
      close={props.close}
      footer={
        <>
          <Button schema="secondary" onClick={props.close}>
            Cancel
          </Button>
          <Button schema="success" onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <div class="flex flex-col gap-2">
        <Select
          label="Provider Type"
          items={props.ctx.state.hosts}
          value={props.provider.type}
          onChange={(ev) => setStore('type', ev.value as any)}
        />
        <TextInput
          label="Name"
          value={store.name || ''}
          onChange={(ev) => setStore('name', ev.currentTarget.value)}
        />
        <Switch>
          <Match when={store.type === 'agnai'}>
            <AgnaiSettings cfg={store} setter={setStore} />
          </Match>

          <Match when={store.type === 'swarm'}>
            <SwarmSettings cfg={store} setter={setStore} />
          </Match>

          <Match when={store.type === 'novel'}>
            <NovelSettings cfg={store} setter={setStore} />
          </Match>

          <Match when={store.type === 'horde'}>
            <HordeSettings cfg={store} setter={setStore} />
          </Match>

          <Match when={store.type === 'sd'}>
            <SDSettings cfg={store} setter={setStore} />
          </Match>

          <Match when={store.type === 'openai'}>
            <OpenAISettings cfg={store} setter={setStore} />
          </Match>
        </Switch>
      </div>
    </Modal>
  )
}

export const NovelSettings: Component<{
  cfg: ImageProviderSettings
  setter: SetStoreFunction<ImageProviderSettings>
}> = (props) => {
  const state = userStore((s) => ({ user: s.user }))

  const isKeySet = createMemo(() => {
    const provider = state.user?.providers?.find((p) => p.provider === 'known-novel')

    const isSet = !!provider?.keySet || !!state.user?.novelApiKey
    return isSet
  })

  const models = Object.entries(NOVEL_IMAGE_MODEL).map(([key, value]) => ({
    label: `Model: ${key}`,
    value,
  }))
  const samplers = Object.entries(NOVEL_SAMPLER_REV).map(([key, value]) => ({
    label: `Sampler: ${value}`,
    value: key,
  }))
  return (
    <>
      <Show when={!isKeySet()}>
        <div class="font-bold text-red-600">
          You do not have a valid NovelAI key set. You will not be able to generate images using
          Novel.
        </div>
      </Show>

      <Toggle
        fieldName="novelQualityTags"
        label="Add Quality Tags"
        value={props.cfg.qualityTags}
        onChange={(ev) => props.setter('qualityTags', ev)}
      />

      <Select
        fieldName="novelUndesiredContent"
        label="Undesired Content"
        helperMarkdown="Add `nsfw` to your negative prompt to omit NSFW content"
        inline
        class="!py-1"
        items={[
          { label: 'Heavy', value: '0' },
          { label: 'Light', value: '1' },
          { label: 'None', value: '2' },
        ]}
        value={props.cfg.ucPreset || '0'}
        onChange={(ev) => props.setter('ucPreset', ev.value)}
      />

      <Select
        fieldName="novelImageModel"
        items={models}
        inline
        class="!py-1"
        value={props.cfg.model}
        onChange={(ev) => props.setter('model', ev.value)}
      />
      <Select
        fieldName="novelSampler"
        items={samplers}
        inline
        class="!py-1"
        value={props.cfg.sampler || NOVEL_SAMPLER_REV.k_dpmpp_2m}
        onChange={(ev) => props.setter('sampler', ev.value)}
      />
    </>
  )
}

export const HordeSettings: Component<{
  cfg: ImageProviderSettings
  setter: SetStoreFunction<ImageProviderSettings>
}> = (props) => {
  const cfg = settingStore((s) => ({ imageWorkers: s.imageWorkers }))

  const models = createMemo(() => {
    const map = new Map<string, number>()

    for (const worker of cfg.imageWorkers) {
      for (const model of worker.models) {
        if (!map.has(model)) {
          map.set(model, 0)
        }

        const current = map.get(model) ?? 0
        map.set(model, current + 1)
      }
    }

    const items = Array.from(map.entries())
      .sort(([, l], [, r]) => (l > r ? -1 : l === r ? 0 : 1))
      .map(([name, count]) => ({
        label: `Model: ${name} (${count})`,
        value: name,
      }))
    return items
  })

  createEffect(() => {
    settingStore.getHordeImageWorkers()
    settingStore.getImageLoras()
  })

  const samplers = Object.entries(SD_SAMPLER_REV).map(([key, value]) => ({
    label: `Sampler: ${value}`,
    value: key,
  }))
  return (
    <>
      <Select
        fieldName="hordeImageModel"
        items={models()}
        inline
        class="!py-1"
        value={props.cfg.model || 'stable_diffusion'}
        onChange={(ev) => props.setter('model', ev.value)}
      />
      <Select
        fieldName="hordeSampler"
        items={samplers}
        class="!py-1"
        inline
        value={props.cfg.sampler || SD_SAMPLER['DPM++ 2M']}
        onChange={(ev) => props.setter('sampler', ev.value)}
      />
    </>
  )
}

const SD_SAMPLERS = Object.entries(SD_SAMPLER_REV).map(([key, value]) => ({
  label: `Sampler: ${value}`,
  value: key,
}))

const SWARM_SAMPLERS = Object.entries(SWARM_SAMPLER_REV).map(([key, value]) => ({
  label: `Sampler: ${value}`,
  value: key,
}))

export const SwarmSettings: Component<{
  cfg: ImageProviderSettings
  setter: SetStoreFunction<ImageProviderSettings>
}> = (props) => {
  const emitter = createEmitter('open')
  const [models, setModels] = createSignal<CustomOption[]>([])
  const [loraList, setLoraList] = createSignal<LoraItem[]>([])
  const loras = useLoras(props.setter, props.cfg.loras)

  const loadModels = async () => {
    if (props.cfg.type !== 'swarm') return
    const result = await imageApi.getImageModelList({
      type: 'swarm',
      local: props.cfg.local,
      url: props.cfg.url,
    })

    const options = result.models.map((model) => ({ label: model.title, value: model.title }))
    if ('loras' in result) {
      const opts = result.loras.map<LoraItem>((model) => ({
        id: model.title,
        name: model.title,
        tags: model.tags?.reduce(
          (prev, curr, i, all) => Object.assign(prev, { [curr]: all.length - i }),
          {} as Record<string, number>
        ),
      }))
      setLoraList(opts)
    } else {
      setLoraList([])
    }

    options.unshift({ label: 'Automatic', value: '' })
    setModels(options)
  }

  onMount(() => {
    emitter.on('open', loadModels)
  })

  return (
    <>
      <TextInput
        fieldName="sdUrl"
        label="SwarmUI URL"
        helperText="Base URL for SwarmUI. E.g. https://local-tunnel-url-10-20-30-40.loca.lt. If you are self-hosting, you can use http://localhost:7801"
        placeholder="E.g. https://local-tunnel-url-10-20-30-40.loca.lt"
        value={props.cfg.url || 'http://localhost:7801'}
        onChange={(ev) => props.setter('url', ev.currentTarget.value)}
      />

      <div class="flex items-center gap-1">
        <CustomSelect
          listener={emitter.emit}
          onSelect={(ev) => props.setter('model', ev.value)}
          selected={props.cfg.model}
          options={models()}
          buttonLabel={props.cfg.model || 'Automatic'}
          autoSearch={true}
        />

        <Show when={loraList().length}>
          <Button size="sm" onClick={() => loras.add(props.cfg)}>
            + Lora
          </Button>
        </Show>

        <div class="icon-button" onClick={loadModels}>
          <RefreshCcw />
        </div>
      </div>

      <LoraSelector cfg={props.cfg} hook={loras} items={loraList()} />

      <Select
        fieldName="swarmSampler"
        items={SWARM_SAMPLERS}
        inline
        class="!py-1"
        value={props.cfg.sampler || SWARM_SAMPLER['Euler a']}
        onChange={(ev) => props.setter('sampler', ev.value)}
      />

      <Toggle
        label="Use Local Requests"
        value={props.cfg.local ?? false}
        onChange={(ev) => props.setter('local', ev)}
      />
    </>
  )
}

export const SDSettings: Component<{
  cfg: ImageProviderSettings
  setter: SetStoreFunction<ImageProviderSettings>
}> = (props) => {
  const emitter = createEmitter('open')
  const [providers] = useProviderList(true)
  const [models, setModels] = createSignal<CustomOption[]>([])
  const providerLabel = createMemo(() => {
    if (!props.cfg.providerId) return 'None Selected'

    const selected = providers().find((p) => p.value === props.cfg.providerId)
    if (!selected) return 'None Selected'

    return selected.label
  })

  const loadModels = async () => {
    if (!props.cfg.url) return
    const result = await imageApi.getSDModelList({
      url: props.cfg.url,
      providerId: props.cfg.providerId,
    })

    const options = result.models.map((model) => ({ label: model.title, value: model.title }))
    options.unshift({ label: 'Automatic', value: '' })
    setModels(options)
  }

  onMount(() => {
    emitter.on('open', loadModels)
  })

  return (
    <>
      <TextInput
        fieldName="sdUrl"
        label="SD WebUI URL"
        helperText="Base URL for Stable Diffusion. E.g. https://local-tunnel-url-10-20-30-40.loca.lt. If you are self-hosting, you can use http://localhost:7860"
        placeholder="E.g. https://local-tunnel-url-10-20-30-40.loca.lt"
        value={props.cfg.url}
        onChange={(ev) => props.setter('url', ev.currentTarget.value)}
      />

      <CustomSelect
        onSelect={(ev) => props.setter('providerId', ev.value)}
        selected={props.cfg.providerId}
        helperText="Use API Key from a Provider"
        options={providers()}
        buttonLabel={providerLabel()}
      />

      <div class="flex items-center gap-1">
        <CustomSelect
          listener={emitter.emit}
          onSelect={(ev) => props.setter('model', ev.value)}
          selected={props.cfg.model}
          options={models()}
          buttonLabel={props.cfg.model || 'Automatic'}
          autoSearch={true}
        />
        <div class="icon-button" onClick={loadModels}>
          <RefreshCcw />
        </div>
      </div>

      <Select
        fieldName="sdSampler"
        items={SD_SAMPLERS}
        inline
        class="!py-1"
        value={props.cfg.sampler || SD_SAMPLER['DPM++ 2M']}
        onChange={(ev) => props.setter('sampler', ev.value)}
      />
    </>
  )
}

export const OpenAISettings: Component<{
  cfg: ImageProviderSettings
  setter: SetStoreFunction<ImageProviderSettings>
}> = (props) => {
  const [providers] = useProviderList(true)

  const providerLabel = createMemo(() => {
    if (!props.cfg.providerId) return 'None Selected'

    const selected = providers().find((p) => p.value === props.cfg.providerId)
    if (!selected) return 'None Selected'

    return selected.label
  })

  return (
    <>
      <TextInput
        label="OpenAI Compatible Image API Url"
        placeholder="E.g. https://api.deepinfra.com/v1/openai"
        value={props.cfg.url}
        onChange={(ev) => props.setter('url', ev.currentTarget.value)}
      />

      <CustomSelect
        onSelect={(ev) => props.setter('providerId', ev.value)}
        selected={props.cfg.providerId}
        label="Use API Key from a Provider"
        options={providers()}
        buttonLabel={providerLabel()}
      />

      <TextInput
        label="Model ID"
        value={props.cfg.model}
        onChange={(ev) => props.setter('model', ev.currentTarget.value)}
      />

      {/* <Select
        fieldName="sdSampler"
        items={SD_SAMPLERS}
        inline
        class="!py-1"
        value={props.cfg.sampler || SD_SAMPLER['DPM++ 2M']}
        onChange={(ev) => props.setter(applyStoreProperty(props.cfg, 'sampler', ev.value))}
      /> */}
    </>
  )
}

export const AgnaiSettings: Component<{
  cfg: ImageProviderSettings
  setter: SetStoreFunction<ImageProviderSettings>
}> = (props) => {
  const settings = settingStore((s) => {
    const models = s.config.serverConfig?.imagesModels || []
    return {
      loras: s.loras,
      embeddings: s.embeddings,
      models,
      names: models.map((m) => ({ label: `Model: ${m.desc.trim()}`, value: m.id || m.name })),
    }
  })

  const lhook = useLoras(props.setter, props.cfg.loras)

  const loraList = createMemo(() => {
    const list = lhook.loras().map((lora) => {
      const tags = settings.loras.find((l) => l.id === lora.id)
      if (!tags) return { ...lora, name: lora.id, tags: undefined }
      return { ...lora, id: lora.id, name: lora.id, tags: tags.tags }
    })

    return list
  })

  const model = createMemo(() => {
    const original = props.cfg.model
    const id =
      settings.models.length === 1
        ? settings.models[0].id || settings.models[0].name
        : props.cfg.model || original
    const match = settings.models.find((m) => m.id === id || m.name === id)
    return match
  })

  const samplers = createMemo(() => {
    return Object.entries(SD_SAMPLER_REV).map(([key, value]) => ({
      label: `Sampler: ${value}`,
      value: key,
    }))
  })

  createEffect(
    on(
      () => props.cfg.loras,
      () => {
        const prev = lhook.loras()
        if (prev.length !== props.cfg.loras?.length) return
        lhook.setLoras(props.cfg.loras || [])
      }
    )
  )

  return (
    <>
      <Show when={settings.models.length === 0}>
        <i>No additional options available</i>
      </Show>
      <div class="flex items-end gap-2">
        <Select
          fieldName="agnaiModel"
          label="Image Model"
          items={settings.names}
          value={props.cfg.model || settings.names[0]?.value}
          disabled={settings.models.length <= 1}
          classList={{ hidden: settings.models.length === 0 }}
          onChange={(ev) => props.setter('model', ev.value)}
        />
        <Show when={settings.loras.length}>
          <Button onClick={() => lhook.add(props.cfg)}>+ Lora</Button>
        </Show>
      </div>

      <LoraSelector hook={lhook} cfg={props.cfg} items={loraList()} />

      <Select
        fieldName="agnaiSampler"
        items={samplers()}
        label={`Sampler`}
        value={props.cfg.sampler}
        onChange={(ev) => props.setter('sampler', ev.value)}
      />

      <Toggle
        label="Draft Mode"
        helperText="If available: Quickly generate a lower quality image"
        value={props.cfg.draftMode}
        onChange={(ev) => props.setter('draftMode', ev)}
      />

      <Show when={!!model()}>
        <div>
          <table class="table-auto border-separate border-spacing-1 text-sm ">
            <thead>
              <tr>
                <Th />
                <Th>Steps</Th>
                <Th>CFG</Th>
                <Th>Width</Th>
                <Th>Height</Th>
                <Th>Clip Skip</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <Td class="bg-700 !border-0">Recommended</Td>
                <Td>{model()?.init.steps}</Td>
                <Td>{model()?.init.cfg}</Td>
                <Td>{model()?.init.width}</Td>
                <Td>{model()?.init.height}</Td>
                <Td>{model()?.init.clipSkip || ''}</Td>
              </tr>

              <tr>
                <Td class="bg-700 !border-0">Limits</Td>
                <Td>{model()?.limit.steps}</Td>
                <Td>{model()?.limit.cfg}</Td>
                <Td>{model()?.limit.width}</Td>
                <Td>{model()?.limit.height}</Td>
                <Td>{model()?.limit.clipSkip || ''}</Td>
              </tr>

              <Show when={model()?.init.sampler}>
                <tr>
                  <Td class="bg-700 !border-0">Sampler</Td>
                  <Td span={5}>{(SD_SAMPLER_REV as any)[model()?.init.sampler!]}</Td>
                </tr>
              </Show>

              <tr>
                <Td class="bg-700 !border-0">Prefix</Td>
                <Td span={5}>{model()?.init.prefix}</Td>
              </tr>

              <tr>
                <Td class="bg-700 !border-0">Suffix</Td>
                <Td span={5}>{model()?.init.suffix}</Td>
              </tr>

              <tr>
                <Td class="bg-700 !border-0">Negative</Td>
                <Td span={5}>{model()?.init.negative}</Td>
              </tr>
            </tbody>
          </table>
        </div>
      </Show>
    </>
  )
}

const Th: Component<{ children?: any }> = (props) => (
  <th
    class="rounded-md border-[var(--bg-600)] px-2 font-bold"
    classList={{ border: !!props.children, 'bg-[var(--bg-700)]': !!props.children }}
  >
    {props.children}
  </th>
)
const Td: Component<{ children?: any; span?: number; class?: string }> = (props) => (
  <td
    class={`rounded-md border-[var(--bg-700)] px-2 ${props.class || ''}`}
    colSpan={props.span}
    classList={{ border: !!props.children }}
  >
    {props.children}
  </td>
)

type LoraItem = { id: string; name: string; tags?: Record<string, number> }
type LoraHook = {
  loras: Accessor<ImageProviderLora[]>
  setLoras: Setter<ImageProviderLora[]>
  add: (cfg: ImageProviderSettings) => void
  remove: (cfg: ImageProviderSettings, i: number) => void
  update: (cfg: ImageProviderSettings, i: number, update: Partial<ImageProviderLora>) => void
}

function useLoras(
  setter: SetStoreFunction<ImageProviderSettings>,
  initial: ImageProviderLora[] | undefined
): LoraHook {
  const [loras, setLoras] = createSignal(initial || [])

  const addLora = (cfg: ImageProviderSettings) => {
    const next = loras().concat({
      id: '',
      clipStrength: 1.0,
      modelStrength: 1.0,
      enabled: true,
    })
    setter('loras', next)
    setLoras(next)
  }

  const removeLora = (cfg: ImageProviderSettings, i: number) => {
    const next = loras().filter((_, index) => index !== i)
    setter('loras', next)
    setLoras(next)
  }

  const updateLora = (
    cfg: ImageProviderSettings,
    index: number,
    update: Partial<{ id: string; clipStrength: number; modelStrength: number; enabled?: boolean }>
  ) => {
    const next = loras().map((lora, i) => {
      if (i !== index) return lora
      return { ...lora, ...update }
    })

    setLoras(next)
    setter('loras', next)
  }

  return { loras, setLoras, add: addLora, remove: removeLora, update: updateLora }
}

const LoraSelector: Component<{
  hook: LoraHook
  items: LoraItem[]
  cfg: ImageProviderSettings
}> = (props) => {
  const availableLoras = createMemo(() => {
    const list = props.items
      .filter((lora) => {
        if (!props.items.length) return lora
        return true
        // if (used) return false
      })
      .map((lora) => ({ label: lora.name, value: lora.id }))

    return [{ label: 'None', value: '' }].concat(list)
  })

  const loraList = createMemo(() => {
    const list = props.hook.loras().map((lora) => {
      const tags = props.items.find((l) => l.id === lora.id)
      if (!tags) return { ...lora, tags: undefined }
      return { ...lora, tags: tags.tags }
    })

    return list
  })

  const loraHelp = (tags?: Record<string, number>) => {
    if (!tags) return

    const list = Object.entries(tags)
      .map(([key, value]) => ({ tag: key, count: value }))
      .sort((l, r) => r.count - l.count)

    const content = (
      <div class="flex flex-col">
        <div class="bold">Tags / Keyword</div>
        <div class="flex flex-wrap gap-1">
          <For each={list}>
            {(tag) => (
              <Pill small>
                <span class="bold">{tag.tag}</span>: <span>{tag.count}</span>
              </Pill>
            )}
          </For>
        </div>
      </div>
    )

    pageStore.openConfirm({ message: content })
  }

  return (
    <Index each={loraList()}>
      {(lora, i) => (
        <Card class="flex flex-col gap-1">
          <div class="flex items-center gap-1">
            <div class="icon-button" onClick={() => props.hook.remove(props.cfg, i)}>
              <X size={20} />
            </div>
            <CustomSelect
              onSelect={(item) => props.hook.update(props.cfg, i, { id: item.value })}
              selected={lora().id}
              options={availableLoras()}
              buttonLabel={lora().id || 'None Selected'}
              autoSearch={true}
            />

            <Button size="sm" schema="hollow" onClick={() => loraHelp(lora().tags)}>
              Tags <Info size={16} />
            </Button>

            <ToggleButton
              size="sm"
              onChange={(ev) => props.hook.update(props.cfg, i, { enabled: ev })}
              value={lora().enabled}
            >
              {lora().enabled ? 'On' : 'Off'}
            </ToggleButton>
          </div>
          <InlineRangeInput
            fieldName="modelStrength"
            label="Model Strength"
            min={0}
            max={2}
            parentClass="text-sm"
            value={lora().modelStrength}
            onChange={(ev) => props.hook.update(props.cfg, i, { modelStrength: +ev })}
            step={0.05}
          />
          <InlineRangeInput
            fieldName="clipStrength"
            label="Clip Strength"
            min={0}
            max={2}
            parentClass="text-sm"
            value={lora().clipStrength}
            onChange={(ev) => props.hook.update(props.cfg, i, { clipStrength: +ev })}
            step={0.05}
          />
        </Card>
      )}
    </Index>
  )
}
