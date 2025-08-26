import { Component, Match, Show, Switch, createMemo, createSignal, onMount } from 'solid-js'
import { FLAI_CONTEXTS, GOOGLE_MODELS, OpenRouterModel } from '/common/adapters'
import TextInput from '../TextInput'
import Button from '../Button'
import { getStore } from '/web/store/create'
import { presetStore, settingStore, toastStore } from '/web/store'
import Select, { Option } from '../Select'
import { CustomOption, CustomSelect } from '../CustomSelect'
import { ArliModel } from '/srv/adapter/arli'
import { Copy } from '../Copy'
import { RefreshCcw, Save, X } from 'lucide-solid'
import { NOVEL_MODELS } from '/common/presets/novel'
import { CLAUDE_LABELS, CLAUDE_MODELS } from '/common/presets/claude'
import { AgnaisticSettings } from './Agnaistic'
import { Pill } from '../Card'
import Accordian from '../Accordian'
import { HordeWorkerModal, toHordeModelItem } from '/web/pages/Settings/components/HordeAISettings'
import { RootModal } from '../Modal'
import MultiDropdown from '../MultiDropdown'
import { round } from '/common/util'
import { createEmitter } from '../util'
import { useAppContext } from '/web/store/context'
import { SubscriptionModelOption } from '/common/types/presets'
import { PresetFuncs, PresetState } from '/web/store/preset-context'

type SelectorProps = {
  state: PresetState
  setters: PresetFuncs
  page: string | undefined
}
type Selector = Component<SelectorProps>

export const ThirdPartyModel: Component<{
  state: PresetState
  setters: PresetFuncs
  page?: string
  sub?: SubscriptionModelOption
}> = (props) => {
  const component = createMemo(() => {
    if (!props.state.providerId && props.setters.context.service) {
      switch (props.setters.context.service) {
        case 'claude':
        case 'claude-v2':
          return 'claude-external'

        case 'novel':
        case 'openrouter':
        case 'openrouter-completion':
          return props.setters.context.service
      }

      switch (props.setters.context.format) {
        case 'gemini':
          return props.setters.context.format
      }
    }

    switch (props.setters.context.service) {
      case 'horde':
      case 'novel':
      case 'openrouter':
      case 'openrouter-completion':
      case 'agnaistic':
        return props.setters.context.service

      case 'openai':
      case 'claude':
      case 'claude-v2':
        return 'compat'
    }

    // If there is no provider, it's a legacy preset
    // Therefore, if it isn't set to third-party, don't return a component
    if (!props.setters.context.provider && props.setters.context.service !== 'kobold') return ''

    switch (props.setters.context.format) {
      case 'featherless':
      case 'arli':
        return props.setters.context.format

      case 'claude':
        return 'claude-external'

      case 'gemini':
      case 'mistral':
      case 'aphrodite':
      case 'koboldcpp':
      case 'llamacpp':
      case 'ollama':
      case 'openai':
      case 'openai-chat':
      case 'openai-chatv2':
      case 'vllm':
      case 'tabby':
        return 'compat'
    }
  })

  return (
    <>
      <Switch>
        <Match when={component() === 'agnaistic' || !component()}>
          <AgnaisticSettings
            state={props.state}
            setters={props.setters}
            page={props.page}
            noSave={false}
          />
        </Match>
        <Match when={component() === 'novel'}>
          <NovelAIModel state={props.state} setters={props.setters} page={props.page} />
        </Match>
        <Match when={component() === 'openrouter' || component() === 'openrouter-completion'}>
          <OpenRouterModels state={props.state} setters={props.setters} page={props.page} />
        </Match>

        <Match when={component() === 'featherless'}>
          <FeatherlessModels state={props.state} setters={props.setters} page={props.page} />
        </Match>
        <Match when={component() === 'claude-external'}>
          <ClaudeModel state={props.state} setters={props.setters} page={props.page} />
        </Match>
        <Match when={component() === 'compat'}>
          <CompatModel state={props.state} setters={props.setters} page={props.page} />
        </Match>
        <Match when={component() === 'arli'}>
          <ArliModels state={props.state} setters={props.setters} page={props.page} />
        </Match>
        <Match when={component() === 'gemini'}>
          <GoogleModels state={props.state} setters={props.setters} page={props.page} />
        </Match>
        <Match when={component() === 'horde'}>
          <HordeModels state={props.state} setters={props.setters} page={props.page} />
        </Match>
        <Match when>{null}</Match>
      </Switch>
    </>
  )
}

const CompatModel: Selector = (props) => {
  const emitter = createEmitter('close')

  const [customId, setCustomId] = createSignal('')

  const modelList = createMemo(() => {
    const list = props.setters.models.list.map((value) => ({ label: value, value }))

    return [{ label: 'None', value: '' }].concat(list)
  })

  const onModelSelect = (value: string) => {
    props.setters.setState({ mistralModel: '', googleModel: '', claudeModel: '' })
    // Only change immediately save the preset in chat pages
    setProviderModel(props, value)
  }

  const warning = createMemo(() => {
    if (!props.state.providerId) return
    if (props.setters.models.loading) return
    if (modelList().length <= 1) return

    const modelId =
      props.state.providerModels?.[props.state.providerId] || props.state.thirdPartyModel

    const match = modelList().find((m) => m.value === modelId)
    if (!match) return `Your current model is not in the model list`
  })

  return (
    <div class="flex w-full flex-col gap-1">
      <div class="flex gap-2">
        <CustomSelect
          size="sm"
          closeSub={emitter.on}
          modalTitle={
            <div class="flex flex-col gap-2">
              <div>Select a Model</div>

              <div class="flex gap-2">
                <TextInput
                  prelabel="Manual Model ID"
                  parentClass="w-full !font-normal !text-sm !h-8"
                  class=""
                  value={customId()}
                  onChange={(ev) => {
                    setCustomId(ev.currentTarget.value)
                  }}
                />
                <Button
                  size="sm"
                  schema="primary"
                  onClick={() => {
                    setProviderModel(props, customId())
                    emitter.emit.close()
                  }}
                >
                  Confirm
                </Button>
              </div>
            </div>
          }
          parentClass="flex"
          selected={
            props.state.providerModels?.[props.state.providerId || 'na'] ||
            props.state.thirdPartyModel
          }
          options={modelList()}
          onSelect={(ev) => onModelSelect(ev.value)}
          search={tokenizedSearch}
          buttonParentClass={'max-w-[260px]'}
          buttonClass="ellipsis"
          buttonLabel={
            props.state.providerModels?.[props.state.providerId! || '...'] ||
            props.state.thirdPartyModel ||
            'Model - None selected'
          }
          disabled={props.setters.models.loading}
          footer={<SelectorFooter setters={props.setters} />}
        />

        <Button size="sm" onClick={() => props.setters.refreshModels()}>
          <RefreshCcw size={20} />
        </Button>
      </div>

      <div class="flex w-full flex-col gap-1">
        <Show when={!!warning()}>
          <Pill type="orange" small>
            {warning()}
          </Pill>
        </Show>
      </div>
    </div>
  )
}

const NovelAIModel: Selector = (props) => {
  const cfg = getStore('settings')()

  const novelModels = createMemo(() => {
    const base = modelsToItems(NOVEL_MODELS)
      .map(({ value }) => ({ label: value, value }))
      .concat({ value: '', label: 'Use service default' })

    const match = base.find((b) => b.value === props.state.novelModel)
    const model = props.state.novelModel || ''
    if (model.length > 0 && !match) {
      base.push({ value: model, label: `Custom (${model})` })
    }

    return base
  })

  const label = createMemo(() => {
    const id =
      props.state.providerModels?.[props.state.providerId || 'na'] || props.state.novelModel
    if (!id) return 'Model - None Selected'
    const match = Object.values(NOVEL_MODELS).find((model) => model === id)

    if (!match) return 'Model - None Selected'
    return match
  })

  return (
    <div class="flex flex-wrap gap-2">
      <CustomSelect
        size="sm"
        modalTitle="Select a Model"
        options={novelModels()}
        selected={
          props.state.providerModels?.[props.state.providerId || 'na'] || props.state.novelModel
        }
        onSelect={(ev) => setProviderModel(props, ev.value, { novelModel: ev.value })}
        buttonLabel={label()}
      />
      <Show when={cfg.flags.naiModel}>
        <TextInput
          fieldName="novelModelOverride"
          helperText="Advanced: Use a custom NovelAI model"
          label="NovelAI Model Override"
        />
      </Show>
    </div>
  )
}

const OpenRouterModels: Selector = (props) => {
  const cfg = getStore('settings')()
  const emitter = createEmitter('close')

  const [customId, setCustomId] = createSignal('')

  const openRouterModels = createMemo(() => {
    const list: OpenRouterModel[] = props.setters.models.data || []

    const options = list
      .map((model) => ({
        value: model.id,
        model: model,
        label: (
          <div class="flex w-full flex-col justify-between" title={`${model.id}`}>
            <div class="ellipsis">
              {model.id}{' '}
              <span class="text-500 ml-1 text-sm">{Math.round(model.context_length / 1024)}K</span>
            </div>
            <div class="text-500 flex gap-2 text-xs">
              <div>${round(+(model.pricing?.prompt || 0) * 1_000_000, 2).toFixed(2)} In</div>
              <div>${round(+(model.pricing?.completion || 0) * 1_000_000, 2).toFixed(2)} Out</div>
            </div>
          </div>
        ),
      }))
      .sort((l, r) => l.value.localeCompare(r.value))

    options.unshift({ label: 'Default', value: '', model: {} as any })

    return options
  })

  const label = createMemo(() => {
    const id = props.state.providerId
      ? props.state.providerModels?.[props.state.providerId] || props.state.thirdPartyModel
      : props.state.openRouterModel?.id

    const match = openRouterModels().find((s) => s.value === id)
    if (!match) {
      if (cfg.flags.debug) return `Model - None selected (${id})`
      if (!!id?.trim()) return `Model - ${id}`
      return 'Model - None selected'
    }

    return (
      <span title={`${match.model.id}, ${(match.model.id || '...').toLowerCase()}`}>
        {match.model.id}
        <span class="text-500 ml-1 text-xs">{Math.round(match.model.context_length / 1024)}K</span>
      </span>
    )
  })

  const sub = createEmitter('open')

  onMount(() => {
    sub.on('open', () => {
      const list = openRouterModels()
      if (list.length > 1) return

      props.setters.refreshModels()
    })
  })

  return (
    <div class="flex w-full items-center gap-1">
      <CustomSelect
        maxHeight
        size="sm"
        modalTitle={
          <div class="flex flex-col gap-2">
            <div>Select a Model</div>

            <div class="flex gap-2">
              <TextInput
                prelabel="Manual Model ID"
                parentClass="w-full !font-normal !text-sm !h-8"
                class=""
                value={customId()}
                onChange={(ev) => {
                  setCustomId(ev.currentTarget.value)
                }}
              />
              <Button
                size="sm"
                schema="primary"
                onClick={() => {
                  setProviderModel(props, customId())
                  emitter.emit.close()
                }}
              >
                Confirm
              </Button>

              <Button
                size="sm"
                onClick={() => props.setters.refreshModels(true)}
                disabled={props.setters.models.loading}
              >
                <RefreshCcw size={20} /> Models
              </Button>
            </div>
          </div>
        }
        listener={sub.emit}
        options={openRouterModels()}
        search={tokenizedSearch}
        selected={
          props.state.providerModels?.[props.state.providerId || 'na'] ||
          props.state.openRouterModel?.id
        }
        disabled={props.state.disabled}
        onSelect={(ev) => {
          const model = openRouterModels().find((m) => m.value === ev.value)
          if (model) {
            setProviderModel(props, model?.model.id, { openRouterModel: model.model })
          }
        }}
        buttonLabel={label()}
        footer={<SelectorFooter setters={props.setters} />}
      />

      <div class="flex">
        <Copy
          text={
            props.state.providerModels?.[props.state.providerId || 'na'] ||
            props.state.openRouterModel?.id ||
            ''
          }
        />
      </div>
    </div>
  )
}

const ArliModels: Selector = (props) => {
  const state = settingStore((s) => s.arliai)
  const [modelclass, setModelclass] = createSignal('')

  const label = createMemo(() => {
    const id = props.state.providerId
      ? props.state.providerModels?.[props.state.providerId] || props.state.thirdPartyModel
      : props.state.arliModel
    const match = state.models.find((s) => s.id === id)
    if (!match) {
      return 'Model - None selected'
    }

    return (
      <span title={`${match.status}, ${(match.health || '...').toLowerCase()}`}>
        {match.id}
        <span class="text-500 text-xs">
          {' '}
          {arliContext(match, state.classes)} {match.status}
        </span>
      </span>
    )
  })

  const options = createMemo(() => {
    return state.models
      .slice()
      .filter((s) => {
        const mclass = modelclass()
        if (!mclass) return true
        return s.model_class === mclass
      })
      .map((s) => ({
        label: (
          <div class="flex w-full justify-between" title={`${s.status}`}>
            <div class="ellipsis">{s.id}</div>
            <div class="text-500 text-xs">
              {arliContext(s, state.classes)} {s.status}
            </div>
          </div>
        ),
        value: s.id,
      }))
      .sort((l, r) => l.value.localeCompare(r.value))
  })

  onMount(() => {
    if (!state.models.length) {
      settingStore.getArliAI()
    }
  })

  const search = (value: string, input: string) => {
    const cleanedInput = input.replace(/[^a-z0-9_-]/gi, '').toLowerCase()
    const cleanedValue = value.replace(/[^a-z0-9_-]/gi, '').toLowerCase()
    const res = cleanedInput
      .split(' ')
      .map((text) => new RegExp(text.replace(/\*/gi, '[a-z0-9]'), 'gi'))

    for (const re of res) {
      const match = cleanedValue.match(re)
      if (!match) return false
    }

    return true
  }

  const classes = createMemo(() => {
    const list = Object.entries(state.classes)
      .map(([label, { ctx }]) => ({ label: `${label} - ${Math.round(ctx / 1024)}k`, value: label }))
      .sort((l, r) => l.label.localeCompare(r.label))
    return [{ label: 'All', value: '' }].concat(list)
  })

  return (
    <div class="flex items-center gap-1">
      <CustomSelect
        maxHeight
        size="sm"
        modalTitle="Select a Model"
        options={options()}
        search={search}
        header={
          <Select
            items={classes()}
            value={''}
            label={'Filter: Model Size'}
            onChange={(ev) => setModelclass(ev.value)}
            parentClass="text-sm"
          />
        }
        onSelect={(opt) => {
          setProviderModel(props, opt.value, { arliModel: opt.value })
        }}
        buttonLabel={label()}
        selected={
          props.state.providerModels?.[props.state.providerId || 'na'] || props.state.arliModel
        }
        footer={<SelectorFooter setters={props.setters} />}
      />

      <div class="flex">
        <Copy
          text={
            props.state.providerModels?.[props.state.providerId || 'na'] ||
            props.state.arliModel ||
            ''
          }
        />
      </div>
    </div>
  )
}

let FILTERED_CACHE: Record<string, boolean> = {}

type FLModel = {
  id: string
  name: string
  owned_by: string
  updated_at: string
  model_class: string
  context_length: number
  max_completion_tokens: number
  available_on_current_plan: boolean
  status: 'active' | 'not_deployed' | 'pending_deploy'
  health?: 'OFFLINE' | 'UNHEALTHY' | 'HEALTHY'
}

const FeatherlessModels: Selector = (props) => {
  const [selectedClasses, setClasses] = createSignal<string[]>([])
  const [classesOpen, setClassesOpen] = createSignal(false)

  const availableClasses = createMemo(() => {
    const seen = new Set<string>()
    const list = (props.setters.models.data as FLModel[])
      .reduce((prev, curr) => {
        if (!curr.model_class || seen.has(curr.model_class)) return prev
        seen.add(curr.model_class)
        prev.push({ label: curr.model_class, ctx: curr.context_length })
        return prev
      }, [] as Array<{ label: string; ctx: number }>)
      .map(({ label, ctx }) => ({
        label: `${label} - ${Math.round(ctx / 1024)}k`,
        value: label,
        ctx,
      }))
      .sort((l, r) => l.label.localeCompare(r.label))

    const map = list.reduce((prev, curr) => {
      prev[curr.value] = { label: curr.value, ctx: curr.ctx }
      return prev
    }, {} as Record<string, { ctx: number; label: string }>)

    return { list, map }
  })

  const label = createMemo(() => {
    const id = props.state.providerId
      ? props.state.providerModels?.[props.state.providerId] || props.state.thirdPartyModel
      : props.state.featherlessModel
    const match = props.setters.models.data.find((s) => s.id === id)
    if (!match) return 'Model - None selected'

    return (
      <span title={`${match.status}, ${(match.health || '...').toLowerCase()}`}>
        {match.id}
        <span class="text-500 text-xs">
          {' '}
          {flaiContext(match, availableClasses().map)} {match.status}
        </span>
      </span>
    )
  })

  const options = createMemo(() => {
    const modelClasses = selectedClasses().reduce((prev, curr) => {
      prev.add(curr)
      return prev
    }, new Set<string>())

    const categories: Record<string, { name: string; options: CustomOption[] }> = {}

    for (const model of props.setters.models.data) {
      // Skip models that cannot be used
      if (model.status && model.status !== 'active' && model.health && model.health !== 'HEALTHY') {
        continue
      }

      // If classes are being filtered by the user, skip classes that aren't selected
      if (modelClasses.size > 0 && !modelClasses.has(model.model_class)) continue

      if (!categories[model.model_class]) {
        categories[model.model_class] = { name: model.model_class, options: [] }
      }

      categories[model.model_class].options.push({
        label: (
          <div
            class="flex w-full flex-col"
            title={`${model.status}, ${(model.health || '...').toLowerCase()}`}
          >
            <div class="ellipsis">{model.id}</div>
            <div class="text-500 text-xs">
              {model.model_class} - {flaiContext(model, availableClasses().map)} {model.status}
            </div>
          </div>
        ),
        value: model.id,
        disabled:
          model.status && model.status !== 'active' && model.health && model.health !== 'HEALTHY',
      })
    }

    const options = Array.from(Object.values(categories))
    return options
  })

  onMount(() => {
    FILTERED_CACHE = {}
  })

  const search = (value: string, input: string) => {
    const cleanedInput = input.toLowerCase()
    const cleanedValue = value.toLowerCase()

    for (const re of cleanedInput.split(' ')) {
      const match = cleanedValue.includes(re)
      if (!match) {
        FILTERED_CACHE[value] = false
        return false
      }
    }

    FILTERED_CACHE[value] = true
    return true
  }

  const classes = createMemo(() => {
    const list = availableClasses().list

    list
      .map(({ label, ctx }) => ({ label: `${label} - ${Math.round(ctx / 1024)}k`, value: label }))
      .sort((l, r) => l.label.localeCompare(r.label))
    return [{ label: 'All', value: '' }].concat(list)
  })

  const availables = createMemo(() => {
    const map: Record<string, number> = {}
    for (const model of props.setters.models.data) {
      if (!map[model.model_class]) {
        map[model.model_class] = 0
      }

      const filteredOut = FILTERED_CACHE[model.id]
      if (filteredOut) {
        continue
      }

      if (!model.status || model.status === 'active') {
        map[model.model_class]++
      }
    }

    return map
  })

  const deselectClass = (cls: string) => {
    const next = selectedClasses().filter((s) => s !== cls)
    setClasses(next)
  }

  const selectClass = (cls: string) => {
    const next = selectedClasses().concat(cls)
    setClasses(next)
  }

  const classPills = createMemo(() => {
    const available = availables()
    const set = new Set<string>()
    const selected = selectedClasses()
    for (const cls of selected) {
      set.add(cls)
    }

    const pills = classes()
      .filter((cls) => available[cls.value] > 0)
      .map((cls) => {
        if (set.has(cls.value)) {
          return (
            <Pill class="select-none" small type="green" onClick={() => deselectClass(cls.value)}>
              {cls.value}
            </Pill>
          )
        }

        return (
          <Pill class="select-none" inverse small type="hl" onClick={() => selectClass(cls.value)}>
            {cls.value}
          </Pill>
        )
      })

    return pills
  })

  return (
    <div class="flex items-center gap-1">
      <CustomSelect
        maxHeight
        size="sm"
        modalTitle="Select a Model"
        categories={options()}
        search={search}
        header={
          <Accordian
            class="!bg-opacity-10 !p-1"
            title={<span class="text-sm">Model Classes</span>}
            open={classesOpen()}
            onChange={(ev) => setClassesOpen(ev)}
          >
            <div class="flex w-full flex-wrap gap-1">{classPills()}</div>
          </Accordian>
        }
        onSelect={(opt) => {
          setProviderModel(props, opt.value, { featherlessModel: opt.value })
        }}
        buttonLabel={label()}
        selected={
          props.state.providerModels?.[props.state.providerId || 'na'] ||
          props.state.featherlessModel
        }
        footer={<SelectorFooter setters={props.setters} />}
      />

      <div class="">
        <Copy text={props.state.featherlessModel || ''} />
      </div>
    </div>
  )
}

const ClaudeModel: Selector = (props) => {
  const emitter = createEmitter('close')
  const [customId, setCustomId] = createSignal('')

  const claudeModels: () => Option<string>[] = createMemo(() => {
    const models = new Map(Object.entries(CLAUDE_MODELS) as [keyof typeof CLAUDE_MODELS, string][])
    const labels = Object.entries(CLAUDE_LABELS) as [keyof typeof CLAUDE_MODELS, string][]

    const options = labels.map(([key, label]) => ({ label, value: models.get(key)! }))
    options.unshift({ label: 'None', value: '' })
    return options
  })

  const label = createMemo(() => {
    const id =
      props.state.providerModels?.[props.state.providerId || 'na'] ||
      props.state.thirdPartyModel ||
      props.state.claudeModel ||
      ''
    if (!id) return 'Model - None Selected'
    const match = Object.values(CLAUDE_MODELS).find((model) => model === id)

    if (!match) return id
    return match
  })

  return (
    <CustomSelect
      size="sm"
      modalTitle={
        <div class="flex flex-col gap-2">
          <div>Select a Model</div>

          <div class="flex gap-2">
            <TextInput
              prelabel="Manual Model ID"
              parentClass="w-full !font-normal !text-sm !h-8"
              class=""
              value={customId()}
              onChange={(ev) => {
                setCustomId(ev.currentTarget.value)
              }}
            />
            <Button
              size="sm"
              schema="primary"
              onClick={() => {
                setProviderModel(props, customId())
                emitter.emit.close()
              }}
            >
              Confirm
            </Button>
          </div>
        </div>
      }
      options={claudeModels()}
      selected={
        props.state.providerModels?.[props.state.providerId || 'na'] ||
        props.state.thirdPartyModel ||
        props.state.claudeModel ||
        ''
      }
      onSelect={(ev) => {
        setProviderModel(props, ev.value, { claudeModel: ev.value })
      }}
      search={tokenizedSearch}
      buttonLabel={label()}
      closeSub={emitter.on}
      footer={<SelectorFooter setters={props.setters} />}
    />
  )
}

const GoogleModels: Selector = (props) => {
  const emitter = createEmitter('close')
  const [customId, setCustomId] = createSignal('')
  const label = createMemo(() => {
    const id = props.state.googleModel
    if (!id) return 'Model - None Selected'
    const match = Object.values(GOOGLE_MODELS).find((model) => model.id === id)

    if (!match) return id
    return match.label
  })

  const options = createMemo(() => {
    const list = Object.values(GOOGLE_MODELS).map(({ label, id }) => ({ label, value: id }))
    return list
  })

  return (
    <CustomSelect
      size="sm"
      modalTitle={
        <div class="flex flex-col gap-2">
          <div>Select a Model</div>

          <div class="flex gap-2">
            <TextInput
              prelabel="Manual Model ID"
              parentClass="w-full !font-normal !text-sm !h-8"
              class=""
              value={customId()}
              onChange={(ev) => {
                setCustomId(ev.currentTarget.value)
              }}
            />
            <Button
              size="sm"
              schema="primary"
              onClick={() => {
                setProviderModel(props, customId())
                emitter.emit.close()
              }}
            >
              Confirm
            </Button>
          </div>
        </div>
      }
      options={options()}
      search={tokenizedSearch}
      onSelect={(opt) => {
        setProviderModel(props, opt.value, { googleModel: opt.value })
      }}
      buttonLabel={label()}
      closeSub={emitter.on}
      selected={
        props.state.providerModels?.[props.state.providerId || 'na'] ||
        props.state.googleModel ||
        props.state.thirdPartyModel
      }
      footer={<SelectorFooter setters={props.setters} />}
    />
  )
}

const HordeModels: Selector = (props) => {
  const [show, setShow] = createSignal(false)
  const [showWorkers, setShowWorkers] = createSignal(false)
  const cfg = settingStore((s) => ({
    models: s.models.slice().map(toHordeModelItem),
  }))

  const refreshHorde = () => {
    settingStore.getHordeModels()
    settingStore.getHordeWorkers()
  }

  const [selected, setSelected] = createSignal<string[]>(
    props.state.providerModels?.[props.state.providerId || 'na']?.split(',') || []
  )
  const [selectedWorkers, setSelectedWorkers] = createSignal<string[]>(
    props.state.providerSettings?.[props.state.providerId || 'na']?.workers
  )

  const open = () => {
    setShow(true)
    refreshHorde()
  }

  const save = () => {
    const models = selected()
    const workers = selectedWorkers()

    if (models) {
      setProviderModel(props, models.join(','), { providerSettings: { workers } })
    }
    setShow(false)
  }

  const close = () => {
    setShow(false)
  }

  const currentModels = createMemo(() => {
    const list = props.state.providerModels?.[props.state.providerId || 'na']?.split(',') || []
    return list
  })

  const currentWorkers = createMemo(() => {
    const list = props.state.providerSettings?.[props.state.providerId || 'na']?.workers || []
    return list
  })

  return (
    <>
      <div class="flex items-center gap-2">
        <Button class="w-fit" size="sm" onClick={open}>
          <Show when={currentModels().length} fallback="Select Model(s)">
            {currentModels().length} Model(s) Selected
          </Show>
        </Button>
      </div>
      <RootModal
        show={show()}
        close={close}
        title="Select Horde Models"
        footer={
          <>
            <Button schema="secondary" onClick={close}>
              <X /> Cancel
            </Button>
            <Button onClick={save}>
              <Save /> Select Model(s)
            </Button>
          </>
        }
      >
        <div class="flex flex-col gap-4 text-sm">
          <div class="flex w-full justify-center">
            <Button size="sm" onClick={() => setShowWorkers(true)}>
              Select Worker(s)
            </Button>
          </div>

          <MultiDropdown
            class="min-h-[6rem]"
            fieldName="workers"
            items={cfg.models}
            label="Select Model(s)"
            onChange={(next) => {
              console.log(next)
              setSelected(next.map((n) => n.value))
            }}
            values={selected()}
          />
          <div class="flex items-center justify-between gap-4">
            <div>
              Models selected:{' '}
              {selected()?.length ||
                props.state.providerModels?.[props.state.providerId || 'na']?.split(',').length ||
                '0'}
            </div>
            <Button schema="gray" class="w-max" onClick={() => setSelected([])}>
              De-select All
            </Button>
          </div>
        </div>
      </RootModal>
      <HordeWorkerModal
        show={showWorkers()}
        close={() => setShowWorkers(false)}
        initial={selectedWorkers() || currentWorkers()}
        save={(workers) => setSelectedWorkers(workers.map((w) => w.value))}
      />
    </>
  )
}

function flaiContext(model: FLModel, classes: Record<string, { ctx: number }>) {
  const ctx =
    model.context_length || classes[model.model_class]?.ctx || FLAI_CONTEXTS[model.model_class]
  if (!ctx) return ''

  return `${Math.round(ctx / 1024)}K`
}

function arliContext(model: ArliModel, classes: Record<string, { ctx: number }>) {
  const ctx = model.ctx || classes[model.model_class]?.ctx || FLAI_CONTEXTS[model.model_class]
  if (!ctx) return ''

  return `${Math.round(ctx / 1024)}K`
}

function tokenizedSearch(compare: string, input: string) {
  compare = compare.toLowerCase()
  const words = input.split(' ').map((w) => w.toLocaleLowerCase())

  for (const word of words) {
    if (!compare.includes(word)) return false
  }

  return true
}

function modelsToItems(models: Record<string, string>): Option<string>[] {
  const pairs = Object.entries(models).map(([label, value]) => ({ label, value }))
  return pairs
}

function setProviderModel(
  { state, setters, page }: SelectorProps,
  model: string,
  extras?: Partial<PresetState>
) {
  console.log(`[model updated] ${model}`)
  const update: Partial<PresetState> = extras ?? {}
  update.thirdPartyModel = model

  const settings = state.providerSettings ? { ...state.providerSettings } : {}
  const models = state.providerModels ? { ...state.providerModels } : {}
  if (state.providerId) {
    models[state.providerId] = model
    settings[state.providerId] = update.providerSettings || settings[state.providerId]
  }

  update.providerModels = models
  update.providerSettings = settings

  setters.setState(update)

  if (state._id && page === 'mode') {
    presetStore.updatePreset(state._id, update, {
      quiet: true,
      onSuccess: () => toastStore.success('Model changed'),
    })
  }
}

const SelectorFooter: Component<{ children?: any; setters: PresetFuncs }> = (props) => {
  const [ctx] = useAppContext()
  return (
    <>
      <Show when={ctx.preset}>
        <Button onClick={() => props.setters.refreshModels()}>
          <RefreshCcw size={20} />
          Refresh
        </Button>
      </Show>
    </>
  )
}
