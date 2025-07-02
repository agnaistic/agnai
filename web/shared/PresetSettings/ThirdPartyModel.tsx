import {
  Component,
  Match,
  Show,
  Switch,
  createEffect,
  createMemo,
  createSignal,
  on,
  onMount,
} from 'solid-js'
import { FLAI_CONTEXTS, GOOGLE_MODELS } from '/common/adapters'
import TextInput from '../TextInput'
import Button from '../Button'
import { getStore } from '/web/store/create'
import { presetStore, settingStore, toastStore } from '/web/store'
import Select, { Option } from '../Select'
import { CustomOption, CustomSelect } from '../CustomSelect'
import { FeatherlessModel } from '/srv/adapter/featherless'
import { ArliModel } from '/srv/adapter/arli'
import { Copy } from '../Copy'
import { RefreshCcw, Save, X } from 'lucide-solid'
import { NOVEL_MODELS } from '/common/presets/novel'
import { CLAUDE_LABELS, CLAUDE_MODELS } from '/common/presets/claude'
import { AgnaisticSettings } from './Agnaistic'
import { Pill } from '../Card'
import Accordian from '../Accordian'
import { getPresetEditor, PresetContext, PresetState, SetPresetState } from './types'
import { toHordeModelItem } from '/web/pages/Settings/components/HordeAISettings'
import { RootModal } from '../Modal'
import MultiDropdown from '../MultiDropdown'
import { round } from '/common/util'
import { createEmitter } from '../util'
import { useAppContext } from '/web/store/context'
import { SubscriptionModelOption } from '/common/types/presets'

type SelectorProps = {
  state: PresetState
  setter: SetPresetState
  context: PresetContext
  page: string | undefined
}
type Selector = Component<SelectorProps>

export const ThirdPartyModel: Component<{ page?: string; sub?: SubscriptionModelOption }> = (
  props
) => {
  const [ctx] = useAppContext()
  const [state, setter, _, context] = getPresetEditor()

  createEffect(
    on(
      () => `${ctx.preset?._id}`,
      () => {
        if (state._id === ctx.preset?._id) return
        setter({ providerId: '', thirdPartyKeySet: false, ...ctx.preset })
      }
    )
  )

  const component = createMemo(() => {
    if (!state.providerId && context.service) {
      switch (context.service) {
        case 'claude':
        case 'claude-v2':
          return 'claude-external'

        case 'novel':
        case 'openrouter':
        case 'openrouter-completion':
          return context.service
      }

      switch (context.format) {
        case 'gemini':
          return context.format
      }
    }

    switch (context.service) {
      case 'horde':
      case 'novel':
      case 'openrouter':
      case 'openrouter-completion':
      case 'agnaistic':
        return context.service

      case 'openai':
      case 'claude':
      case 'claude-v2':
        return 'compat'
    }

    // If there is no provider, it's a legacy preset
    // Therefore, if it isn't set to third-party, don't return a component
    if (!context.provider && context.service !== 'kobold') return ''

    switch (context.format) {
      case 'featherless':
      case 'arli':
        return context.format

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

  createEffect(() => {
    const type = component()
    console.log('component', type)
  })

  return (
    <>
      <Switch>
        <Match when={component() === 'agnaistic' || !component()}>
          <AgnaisticSettings
            state={state}
            context={context}
            page={props.page}
            setter={setter}
            sub={props.sub}
            hides={{}}
            noSave={false}
          />
        </Match>
        <Match when={component() === 'novel'}>
          <NovelAIModel state={state} context={context} page={props.page} setter={setter} />
        </Match>
        <Match when={component() === 'openrouter' || component() === 'openrouter-completion'}>
          <OpenRouterModels state={state} context={context} page={props.page} setter={setter} />
        </Match>

        <Match when={component() === 'featherless'}>
          <FeatherlessModels state={state} context={context} page={props.page} setter={setter} />
        </Match>
        <Match when={component() === 'claude-external'}>
          <ClaudeModel state={state} context={context} page={props.page} setter={setter} />
        </Match>
        <Match when={component() === 'compat'}>
          <CompatModel state={state} context={context} page={props.page} setter={setter} />
        </Match>
        <Match when={component() === 'arli'}>
          <ArliModels state={state} context={context} page={props.page} setter={setter} />
        </Match>
        <Match when={component() === 'gemini'}>
          <GoogleModels state={state} context={context} page={props.page} setter={setter} />
        </Match>
        <Match when={component() === 'horde'}>
          <HordeModels state={state} context={context} page={props.page} setter={setter} />
        </Match>
        <Match when>{null}</Match>
      </Switch>
    </>
  )
}

const CompatModel: Selector = (props) => {
  const emitter = createEmitter('close')
  const state = getStore('user')((s) => ({ providers: s.user?.providers || [] }))
  const models = getStore('presets')((s) => ({
    list: s.presetModels.list,
    url: s.presetModels.url,
    loading: s.modelsLoading,
  }))

  const [customId, setCustomId] = createSignal('')

  const modelList = createMemo(() =>
    [{ label: 'None', value: '' }].concat(models.list.map((value) => ({ label: value, value })))
  )

  const onModelSelect = (value: string) => {
    props.setter({ mistralModel: '', googleModel: '', claudeModel: '' })
    // Only change immediately save the preset in chat pages
    setProviderModel(props, value)
  }

  const warning = createMemo(() => {
    if (!props.state.providerId) return
    if (models.loading) return
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
          emitter={emitter.on}
          modalTitle={
            <div class="flex flex-col gap-2">
              <div>Select a Model: {new URL(models.url).host || '...'}</div>

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
          size="sm"
          selected={
            props.state.providerModels?.[props.state.providerId || 'na'] ||
            props.state.thirdPartyModel
          }
          options={modelList()}
          onSelect={(ev) => onModelSelect(ev.value)}
          search={tokenizedSearch}
          buttonLabel={
            <div class="text-md p-1">
              {(props.state.providerModels?.[props.state.providerId! || '...'] ||
                props.state.thirdPartyModel) ??
                'Model - None selected'}
            </div>
          }
          disabled={models.loading || modelList().length <= 1}
        />

        <Button
          onClick={() =>
            getStore('presets').getPresetModelList(props.state, state.providers, false)
          }
        >
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

  const label = createMemo(() => {
    const id = props.state.providerId
      ? props.state.providerModels?.[props.state.providerId] || props.state.thirdPartyModel
      : props.state.openRouterModel?.id

    const match = cfg.config.openRouter.models.find((s) => s.id === id)
    if (!match) return 'Model - None selected'

    return (
      <span title={`${match.id}, ${(match.id || '...').toLowerCase()}`}>
        {match.id}
        <span class="text-500 ml-1 text-xs">{Math.round(match.context_length / 1024)}K</span>
      </span>
    )
  })

  const openRouterModels = createMemo(() => {
    if (!cfg.config.openRouter.models) return []

    const options = cfg.config.openRouter.models
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
              <div>${round(+model.pricing.prompt * 1_000_000, 2).toFixed(2)} In</div>
              <div>${round(+model.pricing.completion * 1_000_000, 2).toFixed(2)} Out</div>
            </div>
          </div>
        ),
      }))
      .sort((l, r) => l.value.localeCompare(r.value))

    options.unshift({ label: 'Default', value: '', model: {} as any })

    return options
  })

  return (
    <div class="flex w-full items-end gap-1">
      <CustomSelect
        maxHeight
        modalTitle="Select a Model"
        options={openRouterModels()}
        search={(value, search) => {
          return value.toLowerCase().includes(search)
        }}
        selected={
          props.state.providerModels?.[props.state.providerId || 'na'] ||
          props.state.openRouterModel?.id
        }
        disabled={props.state.disabled}
        onSelect={(ev) => {
          const model = cfg.config.openRouter.models?.find((m) => m.id === ev.value)
          if (model) {
            setProviderModel(props, model?.id, { openRouterModel: model })
          }
        }}
        buttonLabel={label()}
      />

      <div class="flex items-end pb-2.5">
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
    if (!match) return 'Model - None selected'

    return (
      <span title={`${match.status}, ${(match.health || '...').toLowerCase()}`}>
        {match.id}
        <span class="text-500 text-xs">
          {' '}
          {flaiContext(match, state.classes)} {match.status}
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
    <div class="flex gap-1">
      <CustomSelect
        maxHeight
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
      />

      <div class="flex items-end pb-2.5">
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

const FeatherlessModels: Selector = (props) => {
  const state = settingStore((s) => s.featherless)
  const [selectedClasses, setClasses] = createSignal<string[]>([])
  const [classesOpen, setClassesOpen] = createSignal(false)

  const label = createMemo(() => {
    const id = props.state.providerId
      ? props.state.providerModels?.[props.state.providerId] || props.state.thirdPartyModel
      : props.state.featherlessModel
    const match = state.models.find((s) => s.id === id)
    if (!match) return 'Model - None selected'

    return (
      <span title={`${match.status}, ${(match.health || '...').toLowerCase()}`}>
        {match.id}
        <span class="text-500 text-xs">
          {' '}
          {flaiContext(match, state.classes)} {match.status}
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

    for (const model of state.models) {
      // Skip models that cannot be used
      if (model.status !== 'active') continue

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
              {model.model_class} - {flaiContext(model, state.classes)} {model.status}
            </div>
          </div>
        ),
        value: model.id,
        disabled: model.status !== 'active',
      })
    }

    const options = Array.from(Object.values(categories))
    return options
  })

  onMount(() => {
    FILTERED_CACHE = {}
    if (!state.models.length) {
      settingStore.getFeatherless()
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
      if (!match) {
        FILTERED_CACHE[value] = false
        return false
      }
    }

    FILTERED_CACHE[value] = true
    return true
  }

  const classes = createMemo(() => {
    const list = Object.entries(state.classes)
      .map(([label, { ctx }]) => ({ label: `${label} - ${Math.round(ctx / 1024)}k`, value: label }))
      .sort((l, r) => l.label.localeCompare(r.label))
    return [{ label: 'All', value: '' }].concat(list)
  })

  const availables = createMemo(() => {
    const map: Record<string, number> = {}
    for (const model of state.models) {
      if (!map[model.model_class]) {
        map[model.model_class] = 0
      }

      const filteredOut = FILTERED_CACHE[model.id]
      if (filteredOut) {
        continue
      }

      if (model.status === 'active') {
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
    <div class="flex items-end gap-1">
      <CustomSelect
        maxHeight
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
      />

      <div class="pb-2">
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
      search={(value, search) => value.toLowerCase().includes(search.toLowerCase())}
      buttonLabel={label()}
      emitter={emitter.on}
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
      search={(value, search) => value.toLowerCase().includes(search.toLowerCase())}
      onSelect={(opt) => {
        setProviderModel(props, opt.value, { googleModel: opt.value })
      }}
      buttonLabel={label()}
      emitter={emitter.on}
      selected={
        props.state.providerModels?.[props.state.providerId || 'na'] ||
        props.state.googleModel ||
        props.state.thirdPartyModel
      }
    />
  )
}

const HordeModels: Selector = (props) => {
  const [show, setShow] = createSignal(false)
  const cfg = settingStore((s) => ({
    models: s.models.slice().map(toHordeModelItem),
  }))

  const refreshHorde = () => {
    settingStore.getHordeModels()
    settingStore.getHordeWorkers()
  }

  const [selected, setSelected] = createSignal<Option[]>()

  const open = () => {
    setShow(true)
    refreshHorde()
  }

  const save = () => {
    const models = selected()
    if (models) {
      setProviderModel(props, models.map((m) => m.value).join(','))
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

  return (
    <>
      <div class="flex items-center gap-2">
        <Button class="w-fit" onClick={open}>
          Select Model(s)
        </Button>
        <Show when={currentModels().length}>
          <div class="text-500">{currentModels().length} models selected</div>
        </Show>
      </div>
      <RootModal
        show={show()}
        close={close}
        title="Specify AI Horde Models"
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
          <MultiDropdown
            class="min-h-[6rem]"
            fieldName="workers"
            items={cfg.models}
            label="Select Model(s)"
            onChange={setSelected}
            values={
              selected()?.map((s) => s.value) ||
              props.state.providerModels?.[props.state.providerId || 'na']?.split(',')
            }
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
    </>
  )
}

function flaiContext(
  model: FeatherlessModel,
  classes: Record<string, { ctx: number; res: number }>
) {
  const ctx = model.ctx || classes[model.model_class]?.ctx || FLAI_CONTEXTS[model.model_class]
  if (!ctx) return ''

  return `${Math.round(ctx / 1024)}K`
}

function arliContext(model: ArliModel, classes: Record<string, { ctx: number; res: number }>) {
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
  { state, setter, page }: SelectorProps,
  model: string,
  extras?: Partial<PresetState>
) {
  const update: Partial<PresetState> = extras ?? {}
  update.thirdPartyModel = model
  const models = state.providerModels ? { ...state.providerModels } : {}
  if (state.providerId) {
    models[state.providerId] = model
  }

  update.providerModels = models

  setter(update)

  if (state._id && page === 'mode') {
    presetStore.updatePreset(state._id, update, {
      quiet: true,
      onSuccess: () => toastStore.success('Model changed'),
    })
  }
}
