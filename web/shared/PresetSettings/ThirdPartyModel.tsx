import { Match, Show, Switch, createMemo, createSignal, onMount } from 'solid-js'
import { FLAI_CONTEXTS } from '/common/adapters'
import TextInput from '../TextInput'
import Button from '../Button'
import { getStore } from '/web/store/create'
import { settingStore, toastStore } from '/web/store'
import Select, { Option } from '../Select'
import { FormLabel } from '../FormLabel'
import { CustomSelect } from '../CustomSelect'
import { FeatherlessModel } from '/srv/adapter/featherless'
import { ArliModel } from '/srv/adapter/arli'
import { Copy } from '../Copy'
import { defaultPresets, isDefaultPreset } from '/common/default-preset'
import { RefreshCcw } from 'lucide-solid'
import { Field } from './Fields'
import { NOVEL_MODELS } from '/common/presets/novel'
import { CLAUDE_MODELS } from '/common/presets/claude'
import { AgnaisticSettings } from './Agnaistic'
import { Pill } from '../Card'

export const ThirdPartyModel: Field = (props) => {
  const component = createMemo(() => {
    switch (props.context.service) {
      case 'novel':
      case 'openrouter':
      case 'openrouter-completion':
      case 'agnaistic':
        return props.context.service

      case 'openai':
      case 'claude':
      case 'claude-v2':
        return 'compat'
    }

    // If there is no provider, it's a legacy preset
    // Therefore, if it isn't set to third-party, don't return a component
    if (!props.context.provider && props.context.service !== 'kobold') return ''

    switch (props.context.format) {
      case 'featherless':
      case 'arli':
        return props.context.format

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
        <Match when={component() === 'agnaistic'}>
          <AgnaisticSettings {...props} noSave={false} />
        </Match>
        <Match when={component() === 'novel'}>
          <NovelAIModel {...props} />
        </Match>
        <Match when={component() === 'openrouter' || component() === 'openrouter-completion'}>
          <OpenRouterModels {...props} />
        </Match>

        <Match when={component() === 'featherless'}>
          <FeatherlessModels {...props} />
        </Match>
        <Match when={component() === 'claude-external'}>
          <ClaudeModel {...props} />
        </Match>
        <Match when={component() === 'compat'}>
          <CompatModel {...props} />
        </Match>
        <Match when={component() === 'arli'}>
          <ArliModels {...props} />
        </Match>
        <Match when>{null}</Match>
      </Switch>
    </>
  )
}

const CompatModel: Field = (props) => {
  const state = getStore('user')((s) => ({ providers: s.user?.providers || [] }))
  const models = getStore('presets')((s) => ({
    list: s.presetModels.list,
    url: s.presetModels.url,
    loading: s.modelsLoading,
  }))

  const modelList = createMemo(() =>
    [{ label: 'None', value: '' }].concat(models.list.map((value) => ({ label: value, value })))
  )

  const onModelSelect = (value: string) => {
    props.setter('thirdPartyModel', value)
    // We intentionally don't unset arli/openrouter here
    props.setter('mistralModel', '')
    props.setter('googleModel', '')
    props.setter('claudeModel', '')

    const isSavedPreest = !!props.state._id && !isDefaultPreset(props.state._id)
    // Only change immediately save the preset in chat pages
    if (isSavedPreest && props.page === 'mode') {
      getStore('presets').updatePreset(
        props.state._id,
        { thirdPartyModel: value },
        {
          quiet: true,
          onSuccess: () => toastStore.success('Model changed'),
        }
      )
    }
  }

  const warning = createMemo(() => {
    if (modelList().length <= 1) return
    const match = modelList().find((m) => m.value === props.state.thirdPartyModel)

    if (match) return `Your current model is not in the model list`
  })

  return (
    <div class="flex w-full flex-col gap-1">
      <FormLabel
        helperText={
          <Show when={!!warning()}>
            <Pill type="orange" small>
              {warning()}
            </Pill>
          </Show>
        }
        label={
          <div class="flex justify-between">
            <div>Model</div>
            <div class="flex gap-2">
              <Show when={modelList().length > 1}>
                <CustomSelect
                  modalTitle={`Select Model: ${new URL(models.url).host || '...'}`}
                  parentClass="flex w-full justify-end"
                  size="sm"
                  selected={props.state.thirdPartyModel}
                  options={modelList()}
                  onSelect={(ev) => onModelSelect(ev.value)}
                  search={tokenizedSearch}
                  buttonLabel={`Select Model`}
                  hide={modelList().length <= 1}
                  disabled={models.loading}
                />
              </Show>

              <Button
                size="sm"
                onClick={() =>
                  getStore('presets').getPresetModelList(props.state, state.providers, false)
                }
              >
                <RefreshCcw size={20} />
              </Button>
            </div>
          </div>
        }
      />

      <div class="flex w-full gap-1">
        <TextInput
          parentClass="w-full"
          fieldName="thirdPartyModel"
          value={props.state.thirdPartyModel ?? ''}
          disabled={props.state.disabled}
          onChange={(ev) => props.setter('thirdPartyModel', ev.currentTarget.value)}
        />
      </div>
    </div>
  )
}

const NovelAIModel: Field = (props) => {
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

  return (
    <div class="flex flex-wrap gap-2">
      <Select
        fieldName="novelModel"
        label="NovelAI Model"
        items={novelModels()}
        value={props.state.novelModel || ''}
        disabled={props.state.disabled}
        onChange={(ev) => props.setter('novelModel', ev.value)}
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

const OpenRouterModels: Field = (props) => {
  const [orfilter, setOrfilter] = createSignal('')
  const cfg = getStore('settings')()

  const openRouterModels = createMemo(() => {
    if (!cfg.config.openRouter.models) return []

    const options = cfg.config.openRouter.models.map((model) => ({
      value: model.id,
      label: model.id,
    }))

    const search = orfilter().trim().toLowerCase()
    const filtered = (
      search ? options.filter((opt) => opt.value.toLowerCase().includes(search)) : options
    ).sort((l, r) => l.label.localeCompare(r.label))

    const includesCurrent = props.state.openRouterModel?.id
      ? filtered.some((v) => v.value === props.state.openRouterModel?.id)
      : true

    if (!includesCurrent) {
      filtered.unshift({
        value: props.state.openRouterModel?.id!,
        label: props.state.openRouterModel?.id!,
      })
    }

    filtered.unshift({ label: 'Default', value: '' })

    return filtered
  })

  return (
    <div class="flex w-full items-end gap-1">
      <Select
        fieldName="openRouterModel"
        label="Model"
        parentClass="w-1/2"
        items={openRouterModels()}
        value={props.state.openRouterModel?.id || ''}
        disabled={props.state.disabled}
        onChange={(ev) => {
          const model = cfg.config.openRouter.models?.find((m) => m.id === ev.value)
          props.setter({ openRouterModel: model, thirdPartyModel: model?.id })
        }}
      />

      <TextInput
        parentClass="w-1/2"
        placeholder="Filter..."
        onChange={(ev) => setOrfilter(ev.currentTarget.value)}
      />
    </div>
  )
}

const ArliModels: Field = (props) => {
  const state = settingStore((s) => s.arliai)
  const [modelclass, setModelclass] = createSignal('')

  const label = createMemo(() => {
    const id = props.state.providerId ? props.state.thirdPartyModel : props.state.arliModel
    const match = state.models.find((s) => s.id === id)
    if (!match) return id || 'None selected'

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
    const res = input.split(' ').map((text) => new RegExp(text.replace(/\*/gi, '[a-z0-9]'), 'gi'))

    for (const re of res) {
      const match = value.match(re)
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
        modalTitle="Select a Model"
        label="Model"
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
          props.setter({ thirdPartyModel: opt.value, arliModel: opt.value })
          if (props.page !== 'mode') return

          getStore('presets').updatePreset(
            props.state._id,
            { thirdPartyModel: opt.value, arliModel: opt.value },
            {
              quiet: true,
              onSuccess: () => toastStore.success('Model changed'),
            }
          )
        }}
        buttonLabel={label()}
        selected={props.state.arliModel}
      />

      <div class="flex items-end pb-2.5">
        <Copy text={props.state.arliModel || ''} />
      </div>
    </div>
  )
}

const FeatherlessModels: Field = (props) => {
  const state = settingStore((s) => s.featherless)
  const [modelclass, setModelclass] = createSignal('')

  const label = createMemo(() => {
    const id = props.state.providerId ? props.state.thirdPartyModel : props.state.featherlessModel
    const match = state.models.find((s) => s.id === id)
    if (!match) return id || 'None selected'

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
      .filter((s) => {
        if (s.status === 'not_deployed') return false
        const mclass = modelclass()
        if (!mclass) return true
        return s.model_class === mclass
      })
      .map((s) => ({
        label: (
          <div
            class="flex w-full justify-between"
            title={`${s.status}, ${(s.health || '...').toLowerCase()}`}
          >
            <div class="ellipsis">{s.id}</div>
            <div class="text-500 text-xs">
              {flaiContext(s, state.classes)} {s.status}
            </div>
          </div>
        ),
        value: s.id,
      }))
      .sort((l, r) => l.value.localeCompare(r.value))
  })

  onMount(() => {
    if (!state.models.length) {
      settingStore.getFeatherless()
    }
  })

  const search = (value: string, input: string) => {
    const res = input.split(' ').map((text) => new RegExp(text.replace(/\*/gi, '[a-z0-9]'), 'gi'))

    for (const re of res) {
      const match = value.match(re)
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
    <div class="flex items-end gap-1">
      <CustomSelect
        modalTitle="Select a Model"
        label="Model"
        options={options()}
        search={search}
        header={
          <Select
            items={classes()}
            value={''}
            label={'Filter: Model Class'}
            fieldName="featherless.classFilter"
            onChange={(ev) => setModelclass(ev.value)}
            parentClass="text-sm"
          />
        }
        onSelect={(opt) => {
          props.setter({ featherlessModel: opt.value, thirdPartyModel: opt.value })
          if (props.page !== 'mode') return

          getStore('presets').updatePreset(props.state._id, {
            thirdPartyModel: opt.value,
            featherlessModel: opt.value,
          })
        }}
        buttonLabel={label()}
        selected={props.state.featherlessModel}
      />

      <div class="pb-2">
        <Copy text={props.state.featherlessModel || ''} />
      </div>
    </div>
  )
}

const ClaudeModel: Field = (props) => {
  const CLAUDE_LABELS = {
    ClaudeV2: 'Latest: Claude v2',
    ClaudeV2_1: 'Claude v2.1',
    ClaudeV2_0: 'Claude v2.0',
    ClaudeV1_100k: 'Latest: Claude v1 100K',
    ClaudeV1_3_100k: 'Claude v1.3 100K',
    ClaudeV1: 'Latest: Claude v1',
    ClaudeV1_3: 'Claude v1.3',
    ClaudeV1_2: 'Claude v1.2',
    ClaudeV1_0: 'Claude v1.0',
    ClaudeInstantV1_100k: 'Latest: Claude Instant v1 100K',
    ClaudeInstantV1_1_100k: 'Claude Instant v1.1 100K',
    ClaudeInstantV1: 'Latest: Claude Instant v1',
    ClaudeInstantV1_1: 'Claude Instant v1.1',
    ClaudeInstantV1_0: 'Claude Instant v1.0',
    ClaudeV3_Opus: 'Claude v3 Opus',
    ClaudeV3_Sonnet: 'Claude v3 Sonnet',
    ClaudeV3_Haiku: 'Claude v3 Haiku',
    ClaudeV35_Sonnet: 'Claude v3.5 Sonnet',
    ClaudeV35_Haiku_Latest: 'Claude v3.5 Haiku (Latest)',
    ClaudeV35_Haiku_Oct2024: 'Claude v3.5 Haiku (Oct 2024)',
    ClaudeV35_Sonnet_Latest: 'Claude v3.5 Sonnet (Latest)',
    ClaudeV35_Sonnet_Oct2024: `Claude v3.5 Sonnet (Oct 2024)`,
    ClaudeV37_Sonnet_Latest: 'Claude v3.7 Sonnet (Latest)',
    ClaudeV37_Sonnet_Feb2025: 'Claude v3.7 Sonnet (Feb 2025)',
  } satisfies Record<keyof typeof CLAUDE_MODELS, string>

  const claudeModels: () => Option<string>[] = createMemo(() => {
    const models = new Map(Object.entries(CLAUDE_MODELS) as [keyof typeof CLAUDE_MODELS, string][])
    const labels = Object.entries(CLAUDE_LABELS) as [keyof typeof CLAUDE_MODELS, string][]

    return labels.map(([key, label]) => ({ label, value: models.get(key)! }))
  })

  return (
    <Select
      fieldName="claudeModel"
      label="Claude Model"
      items={claudeModels()}
      helperText="Which Claude model to use, models marked as 'Latest' will automatically switch when a new minor version is released."
      value={props.state.claudeModel ?? defaultPresets.claude.claudeModel}
      disabled={props.state.disabled}
      onChange={(ev) => props.setter('claudeModel', ev.value)}
    />
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
