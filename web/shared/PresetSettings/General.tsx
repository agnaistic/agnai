import { Component, createMemo, Show } from 'solid-js'
import RangeInput from '../RangeInput'
import TextInput from '../TextInput'
import Select, { Option } from '../Select'
import { defaultPresets } from '../../../common/presets'
import {
  OPENAI_MODELS,
  CLAUDE_MODELS,
  NOVEL_MODELS,
  REPLICATE_MODEL_TYPES,
  MISTRAL_MODELS,
} from '../../../common/adapters'
import { Toggle } from '../Toggle'
import { settingStore, userStore } from '../../store'
import { Card } from '../Card'
import { isValidServiceSetting, serviceHasSetting } from '../util'
import { HordeDetails } from '../../pages/Settings/components/HordeAISettings'
import { PhraseBias, StoppingStrings } from '../PhraseBias'
import { BUILTIN_FORMATS } from '/common/presets/templates'
import { getSubscriptionModelLimits } from '/common/util'
import {
  ContextSize,
  ModelFormat,
  ResponseLength,
  Temperature,
  ThirdPartyKey,
  FeatherlessModels,
  GoogleModels,
  ThirdPartyUrl,
  ArliModels,
} from './Fields'
import { PresetTabProps } from './types'

export const MODEL_FORMATS = Object.keys(BUILTIN_FORMATS).map((label) => ({ label, value: label }))

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
} satisfies Record<keyof typeof CLAUDE_MODELS, string>

export const GeneralSettings: Component<PresetTabProps> = (props) => {
  const cfg = settingStore()
  const user = userStore()

  const subMax = createMemo(() => {
    const level = user.user?.admin ? Infinity : user.userLevel
    const match = getSubscriptionModelLimits(props.sub?.preset, level)
    if (match) return match

    return {
      level,
      maxTokens: props.sub?.preset.maxTokens,
      maxContextLength: props.sub?.preset.maxContextLength,
    }
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

    const match = base.find((b) => b.value === props.state.novelModel)
    const model = props.state.novelModel || ''
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
      <ModelFormat state={props.state} hides={props.hides} setter={props.setter} sub={props.sub} />

      <Card hide={!serviceHasSetting(props.state, 'localRequests')}>
        <Toggle
          fieldName="localRequests"
          label="Use Local Requests"
          helperMarkdown={`When enabled your browser will make requests instead of Agnaistic.\n**NOTE**: Your chat will not support multiplayer.`}
          service={props.state.service}
          format={props.state.thirdPartyFormat}
          hide={props.hides.localRequests}
          value={props.state.localRequests}
          onChange={(ev) => props.setter('localRequests', ev)}
        />
      </Card>

      <Show when={props.state.service === 'horde'}>
        <Card>
          <HordeDetails
            maxTokens={props.state.maxTokens}
            maxContextLength={props.state.maxContextLength!}
          />
        </Card>
      </Show>

      <Card hide={!serviceHasSetting(props.state, 'thirdPartyUrl', 'thirdPartyKey')}>
        <ThirdPartyUrl {...props} />
        <ThirdPartyKey {...props} />

        <div class="flex flex-wrap items-start gap-2">
          <Toggle
            fieldName="thirdPartyUrlNoSuffix"
            label="Disable Auto-URL"
            helperText="No paths will be added to your URL."
            value={props.state.thirdPartyUrlNoSuffix}
            service={props.state.service}
            hide={
              props.hides.thirdPartyFormat ||
              props.state.thirdPartyModel === 'featherless' ||
              props.state.thirdPartyFormat === 'arli'
            }
            onChange={(ev) => props.setter('thirdPartyUrlNoSuffix', ev)}
          />
        </div>
      </Card>

      <Card
        class="flex flex-wrap gap-5"
        hide={
          !serviceHasSetting(
            props.state,
            'oaiModel',
            'openRouterModel',
            'novelModel',
            'claudeModel',
            'mistralModel',
            'replicateModelName',
            'thirdPartyModel',
            'thirdPartyKey'
          )
        }
      >
        <FeatherlessModels
          state={props.state}
          hides={props.hides}
          setter={props.setter}
          sub={props.sub}
        />

        <ArliModels state={props.state} hides={props.hides} setter={props.setter} sub={props.sub} />

        <GoogleModels
          state={props.state}
          hides={props.hides}
          setter={props.setter}
          sub={props.sub}
        />

        <Select
          fieldName="oaiModel"
          label="OpenAI Model"
          items={modelsToItems(OPENAI_MODELS)}
          helperText="Which OpenAI model to use"
          value={props.state.oaiModel ?? defaultPresets.basic.oaiModel}
          disabled={props.state.disabled}
          hide={props.hides.oaiModel}
          onChange={(ev) => props.setter('oaiModel', ev.value)}
        />

        <Select
          fieldName="mistralModel"
          label="Mistral Model"
          items={modelsToItems(MISTRAL_MODELS)}
          helperText="Which Mistral model to use"
          value={props.state.mistralModel ?? ''}
          disabled={props.state.disabled}
          hide={props.hides.mistralModel}
          onChange={(ev) => props.setter('mistralModel', ev.value)}
        />

        <TextInput
          fieldName="thirdPartyModel"
          label="Model Override"
          helperText="Model Override (typically for 3rd party APIs)"
          value={props.state.thirdPartyModel ?? ''}
          disabled={props.state.disabled}
          onChange={(ev) => props.setter('thirdPartyModel', ev.currentTarget.value)}
          hide={props.hides.thirdPartyModel}
        />

        <Select
          fieldName="openRouterModel"
          label="OpenRouter Model"
          items={openRouterModels()}
          helperText="Which OpenRouter model to use"
          value={props.state.openRouterModel?.id || ''}
          hide={props.state.service !== 'openrouter'}
          disabled={props.state.disabled}
          onChange={(ev) =>
            props.setter(
              'openRouterModel',
              cfg.config.openRouter.models?.find((m) => m.id === ev.value)
            )
          }
        />
        <div
          class="flex flex-wrap gap-2"
          classList={{ hidden: !isValidServiceSetting(props.state, 'novelModel') }}
        >
          <Select
            fieldName="novelModel"
            label="NovelAI Model"
            items={novelModels()}
            value={props.state.novelModel || ''}
            disabled={props.state.disabled}
            hide={props.hides.novelModel}
            onChange={(ev) => props.setter('novelModel', ev.value)}
          />
          <Show when={cfg.flags.naiModel}>
            <TextInput
              fieldName="novelModelOverride"
              helperText="Advanced: Use a custom NovelAI model"
              label="NovelAI Model Override"
              hide={props.hides.novelModel}
            />
          </Show>
        </div>

        <Select
          fieldName="claudeModel"
          label="Claude Model"
          items={claudeModels()}
          helperText="Which Claude model to use, models marked as 'Latest' will automatically switch when a new minor version is released."
          value={props.state.claudeModel ?? defaultPresets.claude.claudeModel}
          disabled={props.state.disabled}
          hide={props.hides.claudeModel}
          onChange={(ev) => props.setter('claudeModel', ev.value)}
        />
        <Show when={replicateModels().length > 1}>
          <Select
            fieldName="replicateModelName"
            items={replicateModels()}
            label="Replicate Model"
            value={props.state.replicateModelName}
            helperText={
              <>
                <span>Publicly available language models.</span>
              </>
            }
            hide={props.hides.replicateModelName}
            onChange={(ev) => props.setter('replicateModelName', ev.value)}
          />
        </Show>
        <Select
          fieldName="replicateModelType"
          label="Replicate Model Type"
          items={modelsToItems(REPLICATE_MODEL_TYPES)}
          helperText="Which Replicate API input parameters to use."
          value={props.state.replicateModelType}
          disabled={!!props.state.replicateModelName || props.state.disabled}
          hide={props.hides.replicateModelName}
          onChange={(ev) => props.setter('replicateModelType', ev.value)}
        />
        <TextInput
          fieldName="replicateModelVersion"
          label="Replicate Model by Version (SHA)"
          helperText="Which Replicate model to use (see https://replicate.com/collections/language-models)"
          value={props.state.replicateModelVersion}
          placeholder={`E.g. ${defaultPresets.replicate_vicuna_13b.replicateModelVersion}`}
          disabled={!!props.state.replicateModelName || props.state.disabled}
          hide={props.hides.replicateModelName}
          onChange={(ev) => props.setter('replicateModelVersion', ev.currentTarget.value)}
        />
      </Card>

      <Card class="flex flex-col gap-2">
        <Show
          when={props.state.service === 'kobold' && props.state.thirdPartyFormat === 'aphrodite'}
        >
          <RangeInput
            fieldName="swipesPerGeneration"
            label="Swipes Per Generation"
            helperText="Number of responses (in swipes) that should generate."
            min={1}
            max={10}
            step={1}
            value={props.state.swipesPerGeneration || 1}
            disabled={props.state.disabled}
            onChange={(ev) => props.setter('swipesPerGeneration', ev)}
          />
        </Show>

        <ResponseLength
          state={props.state}
          hides={props.hides}
          setter={props.setter}
          sub={props.sub}
          subMax={subMax()}
        />

        <ContextSize
          state={props.state}
          hides={props.hides}
          setter={props.setter}
          sub={props.sub}
          subMax={subMax()}
        />

        <Temperature {...props} />

        <RangeInput
          fieldName="minP"
          label="Min P"
          helperText="Used to discard tokens with the probability under a threshold (min_p) in the sampling process. Higher values will make text more predictable. (Put this value on 0 to disable its effect)"
          min={0}
          max={1}
          step={0.01}
          value={props.state.minP ?? 0}
          disabled={props.state.disabled}
          aiSetting={'minP'}
          recommended={props.sub?.preset.minP}
          onChange={(ev) => props.setter('minP', ev)}
        />

        <Toggle
          fieldName="streamResponse"
          label="Stream Response"
          helperText="Stream the AI's response as it is generated"
          value={props.state.streamResponse ?? false}
          disabled={props.state.disabled}
          onChange={(ev) => props.setter('streamResponse', ev)}
        />
        <StoppingStrings
          state={props.state}
          hides={props.hides}
          setter={props.setter}
          sub={props.sub}
        />
        <Toggle
          fieldName="disableNameStops"
          label="Disable Name Stops"
          helperText="Disable automatic character names stopping strings"
          value={props.state.disableNameStops}
          onChange={(ev) => props.setter('disableNameStops', ev)}
        />

        <PhraseBias state={props.state} hides={props.hides} setter={props.setter} sub={props.sub} />
      </Card>
    </div>
  )
}

function modelsToItems(models: Record<string, string>): Option<string>[] {
  const pairs = Object.entries(models).map(([label, value]) => ({ label, value }))
  return pairs
}
