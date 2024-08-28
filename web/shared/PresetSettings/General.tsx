import { Component, createMemo, createSignal, Show } from 'solid-js'
import RangeInput from '../RangeInput'
import TextInput from '../TextInput'
import Select, { Option } from '../Select'
import { AppSchema } from '../../../common/types/schema'
import { defaultPresets } from '../../../common/presets'
import {
  OPENAI_MODELS,
  CLAUDE_MODELS,
  NOVEL_MODELS,
  REPLICATE_MODEL_TYPES,
  ThirdPartyFormat,
  MISTRAL_MODELS,
} from '../../../common/adapters'
import { Toggle } from '../Toggle'
import { settingStore, userStore } from '../../store'
import { Card } from '../Card'
import { isValidServiceSetting, serviceHasSetting } from '../util'
import { createStore } from 'solid-js/store'
import { HordeDetails } from '../../pages/Settings/components/HordeAISettings'
import { PhraseBias, StoppingStrings } from '../PhraseBias'
import { BUILTIN_FORMATS } from '/common/presets/templates'
import { PresetProps } from './types'
import { getSubscriptionModelLimits } from '/common/util'

const FORMATS = Object.keys(BUILTIN_FORMATS).map((label) => ({ label, value: label }))

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
} satisfies Record<keyof typeof CLAUDE_MODELS, string>

export const GeneralSettings: Component<
  PresetProps & {
    pane: boolean
    setFormat: (format: ThirdPartyFormat) => void
    format?: ThirdPartyFormat
    tab: string
    sub?: AppSchema.SubscriptionModelOption
  }
> = (props) => {
  const cfg = settingStore()
  const user = userStore()

  const [replicate, setReplicate] = createStore({
    model: props.inherit?.replicateModelName,
    type: props.inherit?.replicateModelType,
    version: props.inherit?.replicateModelVersion,
  })

  const [_, setSwipesPerGeneration] = createSignal(props.inherit?.swipesPerGeneration || 1)
  const [tokens, setTokens] = createSignal(props.inherit?.maxTokens || 150)

  const [context, setContext] = createSignal(
    props.inherit?.maxContextLength || defaultPresets.basic.maxContextLength
  )

  const subMax = createMemo(() => {
    const level = user.user?.admin ? Infinity : user.sub?.level ?? -1
    const match = getSubscriptionModelLimits(props.sub?.preset, level)
    if (match) return match

    return {
      level,
      maxTokens: props.sub?.preset.maxTokens,
      maxContextLength: props.sub?.preset.maxContextLength,
    }
  })

  const maxCtx = createMemo(() => {
    const ctx = subMax()?.maxContextLength
    if (!ctx) return

    const max = Math.floor(ctx / 1000)
    return `${max}K`
  })

  const openRouterModels = createMemo(() => {
    if (!cfg.config.openRouter.models) return []

    const options = cfg.config.openRouter.models.map((model) => ({
      value: model.id,
      label: model.id,
    }))

    options.unshift({ label: 'Default', value: '' })

    return options
  })

  const replicateModels = createMemo(() => {
    if (!cfg.replicate) return []
    const options = Object.entries(cfg.replicate).map(([name, model]) => ({
      label: name,
      value: name,
    }))

    options.unshift({ label: 'Use specific version', value: '' })

    return options
  })

  const novelModels = createMemo(() => {
    const base = modelsToItems(NOVEL_MODELS)
      .map(({ value }) => ({ label: value, value }))
      .concat({ value: '', label: 'Use service default' })

    const match = base.find((b) => b.value === props.inherit?.novelModel)
    const model = props.inherit?.novelModel || ''
    if (model.length > 0 && !match) {
      base.push({ value: model, label: `Custom (${model})` })
    }

    return base
  })

  const claudeModels: () => Option<string>[] = createMemo(() => {
    const models = new Map(Object.entries(CLAUDE_MODELS) as [keyof typeof CLAUDE_MODELS, string][])
    const labels = Object.entries(CLAUDE_LABELS) as [keyof typeof CLAUDE_MODELS, string][]

    return labels.map(([key, label]) => ({ label, value: models.get(key)! }))
  })

  return (
    <div class="flex flex-col gap-2" classList={{ hidden: props.tab !== 'General' }}>
      <Select
        fieldName="modelFormat"
        label="Prompt Format"
        helperMarkdown={`Which formatting method to use if using "universal tags" in your prompt template
            (I.e. \`<user>...</user>, <bot>...</bot>\`)`}
        items={FORMATS}
        value={props.inherit?.modelFormat || 'Alpaca'}
        recommend={props.sub?.preset.modelFormat}
      />

      <Toggle
        fieldName="localRequests"
        label="Use Local Requests"
        helperMarkdown={`When enabled your browser will make requests instead of Agnaistic.\n**NOTE**: Your chat will not support multiplayer.`}
        service={props.service}
        format={props.format}
        aiSetting={'localRequests'}
        value={props.inherit?.localRequests}
      />

      <Show when={props.service === 'horde'}>
        <Card>
          <HordeDetails maxTokens={tokens()} maxContextLength={context()} />
        </Card>
      </Show>

      <Card hide={!serviceHasSetting(props.service, props.format, 'thirdPartyUrl')}>
        <TextInput
          fieldName="thirdPartyUrl"
          label="Third Party URL"
          helperText="Typically a Kobold, Ooba, or other URL"
          placeholder="E.g. https://some-tunnel-url.loca.lt"
          value={props.inherit?.thirdPartyUrl || ''}
          disabled={props.disabled}
          service={props.service}
          format={props.format}
          aiSetting={'thirdPartyUrl'}
        />

        <TextInput
          fieldName="thirdPartyKey"
          label="Third Party Password"
          helperText="Never enter your official OpenAI, Claude, Mistral keys here."
          value={''}
          disabled={props.disabled}
          service={props.service}
          type="password"
          aiSetting={'thirdPartyKey'}
        />

        <div class="flex flex-wrap items-start gap-2">
          <Toggle
            fieldName="thirdPartyUrlNoSuffix"
            label="Disable Auto-URL"
            helperText="No paths will be added to your URL."
            value={props.inherit?.thirdPartyUrlNoSuffix}
            service={props.service}
            aiSetting="thirdPartyUrl"
          />
        </div>
      </Card>

      <Card
        class="flex flex-wrap gap-5"
        hide={
          !serviceHasSetting(
            props.service,
            props.format,
            'oaiModel',
            'openRouterModel',
            'novelModel',
            'claudeModel',
            'mistralModel',
            'replicateModelName',
            'thirdPartyModel'
          )
        }
      >
        <Select
          fieldName="oaiModel"
          label="OpenAI Model"
          items={modelsToItems(OPENAI_MODELS)}
          helperText="Which OpenAI model to use"
          value={props.inherit?.oaiModel ?? defaultPresets.basic.oaiModel}
          disabled={props.disabled}
          service={props.service}
          format={props.format}
          aiSetting={'oaiModel'}
        />

        <Select
          fieldName="mistralModel"
          label="Mistral Model"
          items={modelsToItems(MISTRAL_MODELS)}
          helperText="Which Mistral model to use"
          value={props.inherit?.mistralModel ?? ''}
          disabled={props.disabled}
          service={props.service}
          format={props.format}
          aiSetting={'mistralModel'}
        />

        <TextInput
          fieldName="thirdPartyModel"
          label="Model Override"
          helperText="Model Override (typically for 3rd party APIs)"
          value={props.inherit?.thirdPartyModel ?? ''}
          disabled={props.disabled}
          service={props.service}
          format={props.format}
          aiSetting={'thirdPartyModel'}
        />

        <Select
          fieldName="openRouterModel"
          label="OpenRouter Model"
          items={openRouterModels()}
          helperText="Which OpenRouter model to use"
          value={props.inherit?.openRouterModel?.id || ''}
          disabled={props.disabled}
          service={props.service}
          format={props.format}
          aiSetting={'openRouterModel'}
        />
        <div
          class="flex flex-wrap gap-2"
          classList={{ hidden: !isValidServiceSetting(props.service, props.format, 'novelModel') }}
        >
          <Select
            fieldName="novelModel"
            label="NovelAI Model"
            items={novelModels()}
            value={props.inherit?.novelModel || ''}
            disabled={props.disabled}
            service={props.service}
            format={props.format}
            aiSetting={'novelModel'}
          />
          <Show when={cfg.flags.naiModel}>
            <TextInput
              fieldName="novelModelOverride"
              helperText="Advanced: Use a custom NovelAI model"
              label="NovelAI Model Override"
              aiSetting={'novelModel'}
              format={props.format}
              service={props.service}
            />
          </Show>
        </div>
        <Toggle
          fieldName="antiBond"
          label="Anti-Bond"
          helperText={
            <>
              If this option is enabled, OpenAI will be prompted with logit biases to discourage the
              model from talking about "bonding." This is mostly a problem with GPT-4, but can could
              also be used with other OpenAI models.
            </>
          }
          value={props.inherit?.antiBond ?? false}
          disabled={props.disabled}
          service={props.service}
          format={props.format}
          aiSetting={'antiBond'}
        />
        <Select
          fieldName="claudeModel"
          label="Claude Model"
          items={claudeModels()}
          helperText="Which Claude model to use, models marked as 'Latest' will automatically switch when a new minor version is released."
          value={props.inherit?.claudeModel ?? defaultPresets.claude.claudeModel}
          disabled={props.disabled}
          service={props.service}
          format={props.format}
          aiSetting={'claudeModel'}
        />
        <Show when={replicateModels().length > 1}>
          <Select
            fieldName="replicateModelName"
            items={replicateModels()}
            label="Replicate Model"
            value={props.inherit?.replicateModelName}
            helperText={
              <>
                <span>Publicly available language models.</span>
              </>
            }
            service={props.service}
            format={props.format}
            aiSetting="replicateModelVersion"
            onChange={(ev) => setReplicate('model', ev.value)}
          />
        </Show>
        <Select
          fieldName="replicateModelType"
          label="Replicate Model Type"
          items={modelsToItems(REPLICATE_MODEL_TYPES)}
          helperText="Which Replicate API input parameters to use."
          value={replicate.type}
          disabled={!!replicate.model || props.disabled}
          service={props.service}
          aiSetting={'replicateModelType'}
          format={props.format}
          onChange={(ev) => setReplicate('type', ev.value)}
        />
        <TextInput
          fieldName="replicateModelVersion"
          label="Replicate Model by Version (SHA)"
          helperText="Which Replicate model to use (see https://replicate.com/collections/language-models)"
          value={replicate.version}
          placeholder={`E.g. ${defaultPresets.replicate_vicuna_13b.replicateModelVersion}`}
          disabled={!!replicate.model || props.disabled}
          service={props.service}
          aiSetting={'replicateModelVersion'}
          format={props.format}
          onInput={(ev) => setReplicate('version', ev.currentTarget.value)}
        />
      </Card>

      <Card class="flex flex-col gap-2">
        <Show
          when={
            props.inherit?.service === 'kobold' && props.inherit.thirdPartyFormat === 'aphrodite'
          }
        >
          <RangeInput
            fieldName="swipesPerGeneration"
            label="Swipes Per Generation"
            helperText="Number of responses (in swipes) that aphrodite should generate."
            min={1}
            max={10}
            step={1}
            value={props.inherit?.swipesPerGeneration || 1}
            disabled={props.disabled}
            format={props.format}
            onChange={(val) => setSwipesPerGeneration(val)}
          />
        </Show>
        <RangeInput
          fieldName="maxTokens"
          label="Max New Tokens"
          helperText="Number of tokens the AI should generate. Higher numbers will take longer to generate."
          min={16}
          max={1024}
          step={1}
          value={props.inherit?.maxTokens || 150}
          disabled={props.disabled}
          format={props.format}
          onChange={(val) => setTokens(val)}
          recommended={subMax().maxTokens}
          recommendLabel="Max"
        />
        <RangeInput
          fieldName="maxContextLength"
          label="Max Context Length"
          helperText={
            <>
              <p>
                Maximum context length. If unsure, leave this at 2048. Check your AI service
                documentation for more details.
              </p>
            </>
          }
          min={16}
          max={props.service === 'claude' ? 200000 : 32000}
          step={1}
          value={props.inherit?.maxContextLength || defaultPresets.basic.maxContextLength}
          disabled={props.disabled}
          onChange={(val) => setContext(val)}
          recommended={maxCtx()}
          recommendLabel="Max"
        />
        <Toggle
          fieldName="streamResponse"
          label="Stream Response"
          helperText="Stream the AI's response as it is generated"
          value={props.inherit?.streamResponse ?? false}
          disabled={props.disabled}
        />
        <StoppingStrings inherit={props.inherit} service={props.service} format={props.format} />
        <Toggle
          fieldName="disableNameStops"
          label="Disable Name Stops"
          helperText="Disable automatic character names stopping strings"
          value={props.inherit?.disableNameStops}
        />
        <Toggle
          fieldName="trimStop"
          label="Trim Stop Sequences"
          helperText="Trim Stop Sequences from the AI's response. Does not work with Streaming responses."
          value={props.inherit?.trimStop ?? false}
          disabled={props.disabled}
          service={props.service}
          format={props.format}
          aiSetting={'trimStop'}
        />
        <PhraseBias inherit={props.inherit} service={props.service} format={props.format} />
      </Card>
    </div>
  )
}

function modelsToItems(models: Record<string, string>): Option<string>[] {
  const pairs = Object.entries(models).map(([label, value]) => ({ label, value }))
  return pairs
}
