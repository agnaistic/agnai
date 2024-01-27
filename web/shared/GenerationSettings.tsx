import Sorter from 'sortablejs'
import { Component, createEffect, createMemo, createSignal, For, onMount, Show } from 'solid-js'
import RangeInput from './RangeInput'
import TextInput from './TextInput'
import Select, { Option } from './Select'
import { AppSchema } from '../../common/types/schema'
import { defaultPresets, getFallbackPreset, presetValidator } from '../../common/presets'
import {
  OPENAI_MODELS,
  CLAUDE_MODELS,
  ADAPTER_LABELS,
  AIAdapter,
  NOVEL_MODELS,
  REPLICATE_MODEL_TYPES,
  samplerOrders,
  settingLabels,
  AdapterSetting,
  ThirdPartyFormat,
  THIRDPARTY_FORMATS,
} from '../../common/adapters'
import Divider from './Divider'
import { Toggle } from './Toggle'
import { chatStore, presetStore, settingStore, userStore } from '../store'
import PromptEditor, { BasicPromptTemplate } from './PromptEditor'
import { Card } from './Card'
import { FormLabel } from './FormLabel'
import {
  getFormEntries,
  getStrictForm,
  getUsableServices,
  isValidServiceSetting,
  serviceHasSetting,
  storage,
} from './util'
import { createStore } from 'solid-js/store'
import { defaultTemplate } from '/common/mode-templates'
import Sortable, { SortItem } from './Sortable'
import { HordeDetails } from '../pages/Settings/components/HordeAISettings'
import Button from './Button'
import Accordian from './Accordian'
import { ServiceOption } from '../pages/Settings/components/RegisteredSettings'
import { getServiceTempConfig } from './adapter'
import Tabs from './Tabs'
import { A, useSearchParams } from '@solidjs/router'
import { PhraseBias, StoppingStrings } from './PhraseBias'
import { AgnaisticSettings } from '../pages/Settings/Agnaistic'

import { BUILTIN_FORMATS, templates } from '/common/presets/templates'

import { Trans, useTransContext } from '@mbarzda/solid-i18next'


export { GenerationSettings as default }

type Props = {
  inherit?: Partial<Omit<AppSchema.SubscriptionPreset, 'kind'>>
  disabled?: boolean
  service?: AIAdapter
  onService?: (service?: AIAdapter) => void
  disableService?: boolean
}

const GenerationSettings: Component<Props & { onSave: () => void }> = (props) => {
  const [t] = useTransContext()

  const opts = chatStore((s) => s.opts)
  const userState = userStore()
  const [search, setSearch] = useSearchParams()

  const services = createMemo<Option[]>(() => {
    const list = getUsableServices().map((adp) => ({ value: adp, label: ADAPTER_LABELS(t)[adp] }))
    return list
  })

  const [service, setService] = createSignal(
    props.inherit?.service || (services()[0].value as AIAdapter)
  )
  const [format, setFormat] = createSignal(
    props.inherit?.thirdPartyFormat || userState.user?.thirdPartyFormat
  )
  const tabs = [t('general'), t('prompt'), t('memory'), t('advanced')]
  const [tab, setTab] = createSignal(+(search.tab ?? '0'))

  const onServiceChange = (opt: Option<string>) => {
    setService(opt.value as any)
    props.onService?.(opt.value as any)
  }

  onMount(() => {
    presetStore.getTemplates()
  })

  return (
    <>
      <div class="flex flex-col gap-4">
        <Card>
          <Select
            fieldName="service"
            label={t('ai_service')}
            helperText={
              <>
                <Show when={!service()}>
                  <p class="text-red-500">
                    {t('warning_your_preset_does_not_currently_have_a_service_yet')}
                  </p>
                </Show>
              </>
            }
            value={service()}
            items={services()}
            onChange={onServiceChange}
            disabled={props.disabled || props.disableService}
          />

          <AgnaisticSettings service={service()} inherit={props.inherit} onSave={props.onSave} />

          <Select
            fieldName="thirdPartyFormat"
            label={t('self_host_or_third_party_format')}
            helperText={t('reformat_the_prompt_to_the_desired_output_format')}
            items={[
              { label: t('none'), value: '' },
              { label: t('kobold'), value: 'kobold' },
              { label: t('open_ai'), value: 'openai' },
              { label: t('open_ai_chat'), value: 'openai-chat' },
              { label: t('claude'), value: 'claude' },
              { label: t('textgen_ooba'), value: 'ooba' },
              { label: t('llama_cpp'), value: 'llamacpp' },
              { label: t('aphrodite'), value: 'aphrodite' },
              { label: t('exllamaV2'), value: 'exllamav2' },
              { label: t('kobold_cpp'), value: 'koboldcpp' },
            ]}
            value={props.inherit?.thirdPartyFormat ?? userState.user?.thirdPartyFormat ?? ''}
            service={service()}
            format={format()}
            aiSetting={'thirdPartyFormat'}
            onChange={(ev) => setFormat(ev.value as ThirdPartyFormat)}
          />

          <RegisteredSettings service={service()} inherit={props.inherit} />
        </Card>
        <Show when={!!opts.pane}>
          <TempSettings service={props.inherit?.service} />
        </Show>
        <Tabs
          select={(ev) => {
            setTab(ev)
            setSearch({ tab: ev })
          }}
          selected={tab}
          tabs={tabs}
        />
        <GeneralSettings
          disabled={props.disabled}
          inherit={props.inherit}
          service={service()}
          format={format()}
          pane={!!opts.pane}
          setFormat={setFormat}
          tab={tabs[tab()]}
        />
        <PromptSettings
          disabled={props.disabled}
          inherit={props.inherit}
          service={service()}
          format={format()}
          pane={!!opts.pane}
          tab={tabs[tab()]}
        />
        <GenSettings
          disabled={props.disabled}
          inherit={props.inherit}
          service={service()}
          format={format()}
          pane={!!opts.pane}
          tab={tabs[tab()]}
        />
      </div>
    </>
  )
}

const GeneralSettings: Component<
  Props & {
    pane: boolean
    setFormat: (format: ThirdPartyFormat) => void
    format?: ThirdPartyFormat
    tab: string
  }
> = (props) => {
  const [t] = useTransContext()

  const cfg = settingStore()

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

  const openRouterModels = createMemo(() => {
    if (!cfg.config.openRouter.models) return []

    const options = cfg.config.openRouter.models.map((model) => ({
      value: model.id,
      label: model.id,
    }))

    options.unshift({ label: t('default'), value: '' })

    return options
  })

  const replicateModels = createMemo(() => {
    if (!cfg.replicate) return []
    const options = Object.entries(cfg.replicate).map(([name, model]) => ({
      label: name,
      value: name,
    }))

    options.unshift({ label: t('use_specific_version'), value: '' })

    return options
  })

  const novelModels = createMemo(() => {
    const base = modelsToItems(NOVEL_MODELS)
      .map(({ value }) => ({ label: value, value }))
      .concat({ value: '', label: t('use_service_default') })

    const match = base.find((b) => b.value === props.inherit?.novelModel)
    const model = props.inherit?.novelModel || ''
    if (model.length > 0 && !match) {
      base.push({ value: model, label: t('custom_x', { name: model }) })
    }

    return base
  })

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
  } satisfies Record<keyof typeof CLAUDE_MODELS, string>

  const claudeModels: () => Option<string>[] = createMemo(() => {
    const models = new Map(Object.entries(CLAUDE_MODELS) as [keyof typeof CLAUDE_MODELS, string][])
    const labels = Object.entries(CLAUDE_LABELS) as [keyof typeof CLAUDE_MODELS, string][]

    return labels.map(([key, label]) => ({ label, value: models.get(key)! }))
  })

  return (
    <div class="flex flex-col gap-2" classList={{ hidden: props.tab !== t('general') }}>
      <Show when={props.service === 'horde'}>
        <Card>
          <HordeDetails maxTokens={tokens()} maxContextLength={context()} />
        </Card>
      </Show>

      <Card hide={!serviceHasSetting(props.service, props.format, 'thirdPartyUrl')}>
        <TextInput
          fieldName="thirdPartyUrl"
          label={t('third_party_url')}
          helperText={t('typically_kobold_ooba_or_other_url')}
          placeholder={t('third_party_url_example')}
          value={props.inherit?.thirdPartyUrl || ''}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'thirdPartyUrl'}
        />
        <div class="flex flex-wrap items-start gap-2">
          <Toggle
            fieldName="thirdPartyUrlNoSuffix"
            label={t('disable_auto_url')}
            helperText={t('no_paths_will_be_added_to_your_url')}
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
            'replicateModelName',
            'thirdPartyModel'
          )
        }
      >
        <Select
          fieldName="oaiModel"
          label={t('open_ai_model')}
          items={modelsToItems(OPENAI_MODELS)}
          helperText={t('which_open_ai_model_to_use')}
          value={props.inherit?.oaiModel ?? defaultPresets.basic.oaiModel}
          disabled={props.disabled}
          service={props.service}
          format={props.format}
          aiSetting={'oaiModel'}
        />

        <TextInput
          fieldName="thirdPartyModel"
          label={t('open_ai_model_override')}
          helperText={t('open_ai_model_override_typically_for_third_party_api')}
          value={props.inherit?.thirdPartyModel ?? ''}
          disabled={props.disabled}
          service={props.service}
          format={props.format}
          aiSetting={'thirdPartyModel'}
        />

        <Select
          fieldName="openRouterModel"
          label={t('open_router_model')}
          items={openRouterModels()}
          helperText={t('which_open_router_model_to_use')}
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
            label={t('novel_ai_model')}
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
              helperText={t('advanced_use_a_custom_novel_ai_model')}
              label={t('novel_ai_model_override')}
              aiSetting={'novelModel'}
              format={props.format}
              service={props.service}
            />
          </Show>
        </div>
        <Toggle
          fieldName="antiBond"
          label={t('anti_bond')}
          helperText={t('anti_bond_message')}
          value={props.inherit?.antiBond ?? false}
          disabled={props.disabled}
          service={props.service}
          format={props.format}
          aiSetting={'antiBond'}
        />
        <Select
          fieldName="claudeModel"
          label={t('claude_model')}
          items={claudeModels()}
          helperText={t('which_claude_model_to_use')}
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
            label={t('replicate_model')}
            value={props.inherit?.replicateModelName}
            helperText={
              <>
                <span>{t('publicly_available_language_models')}</span>
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
          label={t('replicate_model_type')}
          items={modelsToItems(REPLICATE_MODEL_TYPES)}
          helperText={t('which_replicate_api_input_parameters_to_use')}
          value={replicate.type}
          disabled={!!replicate.model || props.disabled}
          service={props.service}
          aiSetting={'replicateModelType'}
          format={props.format}
          onChange={(ev) => setReplicate('type', ev.value)}
        />
        <TextInput
          fieldName="replicateModelVersion"
          label={t('replicate_model_by_version_sha')}
          helperText={t('which_replicate_model_to_use')}
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
          label={t('max_new_tokens')}
          helperText={t('number_of_tokens_the_ai_should_generate')}
          min={16}
          max={1024}
          step={1}
          value={props.inherit?.maxTokens || 150}
          disabled={props.disabled}
          format={props.format}
          onChange={(val) => setTokens(val)}
        />
        <RangeInput
          fieldName="maxContextLength"
          label={t('max_context_length')}
          helperText={
            <>
              <p>{t('maximum_context_length_message')}</p>
            </>
          }
          min={16}
          max={props.service === 'claude' ? 200000 : 32000}
          step={1}
          value={props.inherit?.maxContextLength || defaultPresets.basic.maxContextLength}
          disabled={props.disabled}
          onChange={(val) => setContext(val)}
        />
        <Toggle
          fieldName="streamResponse"
          label={t('stream_response')}
          helperText={t('stream_the_ai_response_as_it_is_generated')}
          value={props.inherit?.streamResponse ?? false}
          disabled={props.disabled}
        />
        <StoppingStrings inherit={props.inherit} service={props.service} format={props.format} />
        <Toggle
          fieldName="trimStop"
          label={t('trim_stop_sequence')}
          helperText={t('trim_stop_sequence_message')}
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

const FORMATS = Object.keys(BUILTIN_FORMATS).map((label) => ({ label, value: label }))

const PromptSettings: Component<
  Props & { pane: boolean; format?: ThirdPartyFormat; tab: string }
> = (props) => {
  const [t] = useTransContext()

  const gaslights = presetStore((s) => ({ list: s.templates }))
  const [useAdvanced, setAdvanced] = createSignal(
    !props.inherit?._id
      ? 'basic'
      : typeof props.inherit.useAdvancedPrompt === 'string'
      ? props.inherit.useAdvancedPrompt
      : props.inherit?.useAdvancedPrompt === true || props.inherit.useAdvancedPrompt === undefined
      ? 'validate'
      : 'basic'
  )

  const fallbackTemplate = createMemo(() => {
    if (!props.service) return defaultTemplate
    const preset = getFallbackPreset(props.service)
    return preset?.gaslight || defaultTemplate
  })

  const promptTemplate = createMemo(() => {
    const id = props.inherit?.promptTemplateId
    if (!id) return props.inherit?.gaslight || fallbackTemplate()

    if (id in templates) {
      return templates[id as keyof typeof templates]
    }

    const gaslight = gaslights.list.find((g) => g._id === id)
    return gaslight?.template || props.inherit?.gaslight || fallbackTemplate()
  })

  return (
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-2" classList={{ hidden: props.tab !== t('prompt') }}>
        <Card class="flex flex-col gap-4">
          <Select
            fieldName="modelFormat"
            label="Model Prompt Format"
            helperMarkdown={`Which model's formatting to use if use "universal tags" in your prompt templates
            (E.g. \`<user>...</user>, <bot>...</bot>\`)`}
            items={FORMATS}
            value={props.inherit?.modelFormat || 'Alpaca'}
            hide={useAdvanced() === 'basic'}
          />
          <Select
            fieldName="useAdvancedPrompt"
            label={t('use_advanced_prompting')}
            helperMarkdown={t('use_advanced_prompting_message')}
            items={[
              { label: t('basic'), value: 'basic' },
              { label: t('validated'), value: 'validate' },
              { label: t('unvalidated'), value: 'no-validation' },
            ]}
            value={useAdvanced()}
            onChange={(ev) => setAdvanced(ev.value as any)}
          />

          <BasicPromptTemplate inherit={props.inherit} hide={useAdvanced() !== 'basic'} />

          <PromptEditor
            fieldName="gaslight"
            value={promptTemplate()}
            placeholder={defaultTemplate}
            disabled={props.disabled}
            showHelp
            inherit={props.inherit}
            hide={useAdvanced() === 'basic'}
            showTemplates
          />

          <FormLabel
            label={t('system_prompt')}
            helperText={
              <Trans key="system_prompt_message">
                General instructions for how the AI should respond. Use the
                <code class="text-sm">{'{{system_prompt}}'}</code> placeholder.
              </Trans>
            }
          />
          <PromptEditor
            fieldName="systemPrompt"
            include={['char', 'user']}
            placeholder={t('system_prompt_example')}
            value={props.inherit?.systemPrompt ?? ''}
            disabled={props.disabled}
          />

          <TextInput
            fieldName="ultimeJailbreak"
            label={t('jailbreak_ujb_prompt')}
            helperText={t('jailbreak_ujb_prompt_message')}
            placeholder={t('jailbreak_ujb_prompt_example')}
            isMultiline
            value={props.inherit?.ultimeJailbreak ?? ''}
            disabled={props.disabled}
            class="form-field focusable-field text-900 min-h-[8rem] w-full rounded-xl px-4 py-2 text-sm"
          />
          <Toggle
            fieldName="prefixNameAppend"
            label="Append name of replying character to very end of the prompt"
            helperText={
              <>
                For Claude/OpenAI Chat Completion. Appends the name of replying character and a
                colon to the UJB/prefill.
              </>
            }
            value={props.inherit?.prefixNameAppend ?? true}
            disabled={props.disabled}
            service={props.service}
            format={props.format}
            aiSetting={'prefixNameAppend'}
          />
          <TextInput
            fieldName="prefill"
            label={t('bot_response_prefilling')}
            helperText={t('bot_response_message')}
            placeholder={t('bot_response_example')}
            isMultiline
            value={props.inherit?.prefill ?? ''}
            disabled={props.disabled}
            service={props.service}
            format={props.format}
            class="form-field focusable-field text-900 min-h-[8rem] w-full rounded-xl px-4 py-2 text-sm"
            aiSetting={'prefill'}
          />
          <div class="flex flex-wrap gap-4">
            <Toggle
              fieldName="ignoreCharacterSystemPrompt"
              label={t('override_character_system_prompt')}
              value={props.inherit?.ignoreCharacterSystemPrompt ?? false}
              disabled={props.disabled}
            />
            <Toggle
              fieldName="ignoreCharacterUjb"
              label={t('override_character_jailbreak')}
              value={props.inherit?.ignoreCharacterUjb ?? false}
              disabled={props.disabled}
            />
          </div>
        </Card>
      </div>

      <div classList={{ hidden: props.tab !== t('memory') }}>
        <Card class="flex flex-col gap-2">
          <RangeInput
            fieldName="memoryContextLimit"
            label={t('memory_context_limit')}
            helperText={t('memory_context_limit_message')}
            min={1}
            // No idea what the max should be
            max={2000}
            step={1}
            value={props.inherit?.memoryContextLimit || defaultPresets.basic.memoryContextLimit}
            disabled={props.disabled}
          />

          <RangeInput
            fieldName="memoryChatEmbedLimit"
            label={t('memory_chat_embedding_context_limit')}
            helperText={t('memory_chat_embedding_context_limit_message')}
            min={1}
            max={10000}
            step={1}
            value={props.inherit?.memoryChatEmbedLimit || defaultPresets.basic.memoryContextLimit}
            disabled={props.disabled}
          />

          <RangeInput
            fieldName="memoryUserEmbedLimit"
            label={t('memory_user_specified_embedding_context_limit')}
            helperText={t('memory_user_specified_embedding_context_limit_message')}
            min={1}
            max={10000}
            step={1}
            value={props.inherit?.memoryUserEmbedLimit || defaultPresets.basic.memoryContextLimit}
            disabled={props.disabled}
          />

          <RangeInput
            fieldName="memoryDepth"
            label={t('memory_chat_history_depth')}
            helperText={t('memory_chat_history_depth_message')}
            min={1}
            max={100}
            step={1}
            value={props.inherit?.memoryDepth || defaultPresets.basic.memoryDepth}
            disabled={props.disabled}
          />
        </Card>
      </div>
    </div>
  )
}

const GenSettings: Component<Props & { pane: boolean; format?: ThirdPartyFormat; tab: string }> = (
  props
) => {
  const [t] = useTransContext()

  return (
    <div class="flex flex-col gap-4" classList={{ hidden: props.tab !== t('advanced') }}>
      <Card class="flex flex-col gap-4">
        <RangeInput
          fieldName="temp"
          label={t('temperature')}
          helperText={t('temperature_message')}
          min={0.1}
          max={20}
          step={0.01}
          value={props.inherit?.temp || defaultPresets.basic.temp}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'temp'}
        />

        <RangeInput
          fieldName="cfgScale"
          label={t('cfg_scale')}
          helperText={
            <Trans key="cfg_scale_message">
              Classifier Free Guidance. See
              <a href="https://docs.novelai.net/text/cfg.html" target="_blank" class="link">
                NovelAI's CFG docs
              </a>
              for more information. Set to 1 to disable.
            </Trans>
          }
          min={1}
          max={3}
          step={0.05}
          value={props.inherit?.cfgScale || 1}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'cfgScale'}
          format={props.format}
        />

        <TextInput
          fieldName="cfgOppose"
          label={t('cfg_opposing_prompt')}
          helperText={
            <Trans key="cfg_opposing_prompt_message">
              A prompt that would generate the opposite of what you want. Leave empty if unsure.
              Classifier Free Guidance. See
              <a href="https://docs.novelai.net/text/cfg.html" target="_blank" class="link">
                NovelAI's CFG docs
              </a>
              for more information.
            </Trans>
          }
          value={props.inherit?.cfgOppose || ''}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'cfgScale'}
          format={props.format}
        />

        <Select
          fieldName="phraseRepPenalty"
          label={t('phrase_repetition_penalty')}
          helperText={t('phrase_repetition_penalty_message')}
          items={[
            { label: t('very_aggressive'), value: 'very_aggressive' },
            { label: t('aggressive'), value: 'aggressive' },
            { label: t('medium'), value: 'medium' },
            { label: t('light_2'), value: 'light' },
            { label: t('very_light'), value: 'very_light' },
            { label: t('off'), value: 'off' },
          ]}
          value={props.inherit?.phraseRepPenalty || 'aggressive'}
          service={props.service}
          aiSetting="phraseRepPenalty"
          format={props.format}
        />

        <RangeInput
          fieldName="minP"
          label={t('min_p')}
          helperText={t('min_p_message')}
          min={0}
          max={1}
          step={0.01}
          value={props.inherit?.minP ?? 0}
          disabled={props.disabled}
          service={props.service}
          format={props.format}
          aiSetting={'minP'}
        />

        <RangeInput
          fieldName="topP"
          label={t('top_p')}
          helperText={t('top_p_message')}
          min={0}
          max={1}
          step={0.01}
          value={props.inherit?.topP ?? defaultPresets.basic.topP}
          disabled={props.disabled}
          service={props.service}
          format={props.format}
          aiSetting={'topP'}
        />
        <RangeInput
          fieldName="topK"
          label={t('top_k')}
          helperText={t('top_k_message')}
          min={0}
          max={100}
          step={1}
          value={props.inherit?.topK ?? defaultPresets.basic.topK}
          disabled={props.disabled}
          service={props.service}
          format={props.format}
          aiSetting={'topK'}
        />
        <RangeInput
          fieldName="topA"
          label={t('top_a')}
          helperText={t('top_a_message')}
          min={0}
          max={1}
          step={0.01}
          value={props.inherit?.topA ?? 0}
          disabled={props.disabled}
          service={props.service}
          format={props.format}
          aiSetting={'topA'}
        />

        <Toggle
          fieldName="mirostatToggle"
          label="Use Mirostat"
          helperText={
            <>
              Activates the Mirostat sampling technique. It aims to control perplexity during
              sampling. See the {` `}
              <A class="link" href="https://arxiv.org/abs/2007.14966">
                paper
              </A>
              {'.'} Aphrodite only supports mode 2 (on) or 0 (off).
            </>
          }
          value={props.inherit?.mirostatToggle ?? false}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'mirostatToggle'}
          format={props.format}
        />
        <RangeInput
          fieldName="mirostatTau"
          label={t('microstat_tau')}
          helperText={t('microstat_tau_message')}
          min={0}
          max={6}
          step={0.01}
          value={props.inherit?.mirostatTau ?? 0}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'mirostatTau'}
          format={props.format}
        />
        <RangeInput
          fieldName="mirostatLR"
          label={t('microstat_learning_rate')}
          helperText={t('microstat_learning_rate_message')}
          min={0}
          max={1}
          step={0.01}
          value={props.inherit?.mirostatLR ?? 1}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'mirostatLR'}
          format={props.format}
        />
        <RangeInput
          fieldName="tailFreeSampling"
          label={t('tail_free_sampling')}
          helperText={t('tail_free_sampling_message')}
          min={0}
          max={1}
          step={0.001}
          value={props.inherit?.tailFreeSampling ?? defaultPresets.basic.tailFreeSampling}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'tailFreeSampling'}
          format={props.format}
        />
        <RangeInput
          fieldName="typicalP"
          label={t('typical_p')}
          helperText={t('typical_p_message')}
          min={0}
          max={1}
          step={0.01}
          value={props.inherit?.typicalP ?? defaultPresets.basic.typicalP}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'typicalP'}
          format={props.format}
        />
        <RangeInput
          fieldName="repetitionPenalty"
          label={t('repetition_penalty')}
          helperText={t('repetition_penalty_message')}
          min={0}
          max={3}
          step={0.01}
          value={props.inherit?.repetitionPenalty ?? defaultPresets.basic.repetitionPenalty}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'repetitionPenalty'}
          format={props.format}
        />
        <RangeInput
          fieldName="repetitionPenaltyRange"
          label={t('repetition_penalty_range')}
          helperText={t('repetition_penalty_range_message')}
          min={0}
          max={2048}
          step={1}
          value={
            props.inherit?.repetitionPenaltyRange ?? defaultPresets.basic.repetitionPenaltyRange
          }
          disabled={props.disabled}
          service={props.format != 'aphrodite' ? props.service : 'openai'} // we dont want this showing if the format is set to aphrodite
          aiSetting={'repetitionPenaltyRange'}
          format={props.format}
        />
        <RangeInput
          fieldName="repetitionPenaltySlope"
          label={t('repetition_penalty_slope')}
          helperText={t('repetition_penalty_slope_message')}
          min={0}
          max={10}
          step={0.01}
          value={
            props.inherit?.repetitionPenaltySlope ?? defaultPresets.basic.repetitionPenaltySlope
          }
          disabled={props.disabled}
          service={props.format != 'aphrodite' ? props.service : 'openai'} // we dont want this showing if the format is set to aphrodite
          aiSetting={'repetitionPenaltySlope'}
          format={props.format}
        />
        <RangeInput
          fieldName="etaCutoff"
          label="ETA Cutoff"
          helperText={
            <>
              In units of 1e-4; a reasonable value is 3. The main parameter of the special Eta
              Sampling technique. See {` `}
              <A class="link" href="https://arxiv.org/pdf/2210.15191.pdf">
                this paper
              </A>{' '}
              for a description.
            </>
          }
          min={0}
          max={20}
          step={0.0001}
          value={props.inherit?.etaCutoff ?? 0}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'etaCutoff'}
          format={props.format}
        />
        <RangeInput
          fieldName="epsilonCutoff"
          label="Epsilon Cutoff"
          helperText="In units of 1e-4; a reasonable value is 3. This sets a probability floor below which tokens are excluded from being sampled."
          min={0}
          max={9}
          step={0.0001}
          value={props.inherit?.epsilonCutoff ?? 0}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'epsilonCutoff'}
          format={props.format}
        />
        <Show when={!props.service}>
          <Divider />
          <div class="text-2xl">{t('open_ai')}</div>
        </Show>
        <RangeInput
          fieldName="frequencyPenalty"
          label={t('frequency_penalty')}
          helperText={t('frequency_penalty_message')}
          min={-2.0}
          max={2.0}
          step={0.01}
          value={props.inherit?.frequencyPenalty ?? defaultPresets.openai.frequencyPenalty}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'frequencyPenalty'}
          format={props.format}
        />
        <RangeInput
          fieldName="presencePenalty"
          label={t('presence_penalty')}
          helperText={t('presence_penalty_message')}
          min={-2.0}
          max={2.0}
          step={0.01}
          value={props.inherit?.presencePenalty ?? defaultPresets.openai.presencePenalty}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'presencePenalty'}
          format={props.format}
        />
        <Show when={!props.service}>
          <Divider />
          <div class="text-2xl">{t('text_gen_or_ooba')}</div>
        </Show>
        <Toggle
          fieldName="addBosToken"
          label={t('add_bos_token')}
          helperText={t('add_bos_token_message')}
          value={props.inherit?.addBosToken ?? true}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'addBosToken'}
          format={props.format}
        />
        <Toggle
          fieldName="banEosToken"
          label={t('ban_eos_token')}
          helperText={t('ban_eos_token_message')}
          value={props.inherit?.banEosToken ?? false}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'banEosToken'}
          format={props.format}
        />
        <Toggle
          fieldName="skipSpecialTokens"
          label={t('skip_special_tokens')}
          helperText={t('skip_special_tokens_message')}
          value={props.inherit?.skipSpecialTokens ?? true}
          disabled={props.disabled}
          service={props.service}
          aiSetting="skipSpecialTokens"
          format={props.format}
        />
        <RangeInput
          fieldName="encoderRepitionPenalty"
          label={t('encoder_repetition_penalty')}
          helperText={t('encoder_repetition_penalty_message')}
          min={0.8}
          max={1.5}
          step={0.01}
          value={
            props.inherit?.encoderRepitionPenalty ?? defaultPresets.basic.encoderRepitionPenalty
          }
          disabled={props.disabled}
          service={props.service}
          aiSetting={'encoderRepitionPenalty'}
          format={props.format}
        />
        <Toggle
          fieldName="doSample"
          label={t('do_sample')}
          helperText={t('do_sample_message')}
          value={props.inherit?.doSample ?? true}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'doSample'}
          format={props.format}
        />
        <RangeInput
          fieldName="penaltyAlpha"
          label={t('penalty_alpha')}
          helperText={t('penalty_alpha_message')}
          min={0}
          max={5}
          step={0.01}
          value={props.inherit?.penaltyAlpha ?? defaultPresets.basic.penaltyAlpha}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'penaltyAlpha'}
          format={props.format}
        />
        <Toggle
          fieldName="earlyStopping"
          label={t('early_stopping')}
          helperText={t('early_stopping_message')}
          value={props.inherit?.earlyStopping ?? false}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'earlyStopping'}
          format={props.format}
        />
        <RangeInput
          fieldName="numBeams"
          label={t('number_of_beams')}
          helperText={t('number_of_beams_message')}
          min={1}
          max={20}
          step={1}
          value={props.inherit?.numBeams ?? 1}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'numBeams'}
          format={props.format}
        />

        <SamplerOrder service={props.service} inherit={props.inherit} />
      </Card>
    </div>
  )
}

const SamplerOrder: Component<{
  service?: AIAdapter
  inherit?: Partial<AppSchema.GenSettings>
}> = (props) => {
  const [t] = useTransContext()

  const presetOrder = createMemo(() => {
    if (!props.inherit?.order) return ''
    // Guests persist the string instead of the array for some reason
    if (typeof props.inherit.order === 'string') return props.inherit.order
    return props.inherit.order.join(',')
  })
  const [order, setOrder] = createSignal(presetOrder())

  const [value, setValue] = createSignal(order())
  const [disabled, setDisabled] = createSignal(ensureArray(props.inherit?.disabledSamplers))
  const [sorter, setSorter] = createSignal<Sorter>()

  createEffect(() => {
    // Try to detect if the inherited settings change
    const inherited = presetOrder()
    if (inherited !== order()) {
      setOrder(inherited)
      setValue(inherited)
      setDisabled(props.inherit?.disabledSamplers || [])
      resort()
    }
  })

  const updateValue = (next: SortItem[]) => {
    setValue(next.map((n) => n.value).join(','))
  }

  const toggleSampler = (id: number) => {
    if (!props.service) return
    const temp = samplerOrders[props.service]?.findIndex((val) => val === 'temp')!

    if (disabled().includes(id)) {
      const next = disabled().filter((sampler) => sampler !== temp && sampler !== id)
      setDisabled(next)
      return
    }

    const next = id === temp ? disabled() : disabled().concat(id)
    setDisabled(next)
  }

  const items = createMemo(() => {
    const list: SortItem[] = []
    if (!props.service) return list

    const order = samplerOrders[props.service]
    if (!order) return []

    let id = 0
    for (const item of order) {
      list.push({
        id: id++,
        value: item,
        label: settingLabels[item]!,
      })
    }

    return list
  })

  const resort = () => {
    const sort = sorter()
    if (!sort) return

    sort.sort(value().split(','))
  }

  return (
    <div
      classList={{
        hidden: items().length === 0 || props.inherit?.thirdPartyFormat === 'aphrodite',
      }}
    >
      <Sortable
        label={t('sampler_order')}
        items={items()}
        onChange={updateValue}
        setSorter={(s) => {
          setSorter(s)
          resort()
        }}
      />

      <Card hide={props.service !== 'novel'}>
        <FormLabel
          fieldName="disabledSamplers"
          label={t('enabled_samplers')}
          helperText={t('enabled_samplers_message')}
        />

        <div class="flex flex-wrap gap-2">
          <For each={items()}>
            {(item) => (
              <Button
                size="sm"
                schema={disabled().includes(+item.id) ? 'secondary' : 'success'}
                onClick={() => toggleSampler(+item.id)}
              >
                {item.label}
              </Button>
            )}
          </For>
        </div>
      </Card>

      <TextInput fieldName="order" parentClass="hidden" value={value()} />
      <TextInput fieldName="disabledSamplers" parentClass="hidden" value={disabled().join(',')} />
    </div>
  )
}

type TempSetting = AdapterSetting & { value: any }

const TempSettings: Component<{ service?: AIAdapter }> = (props) => {
  const [t] = useTransContext()

  const [settings, setSettings] = createStore({
    service: props.service,
    values: getServiceTempConfig(props.service),
  })

  createEffect(() => {
    if (settings.service === props.service) return

    const values = getServiceTempConfig(props.service)
    setSettings({ service: props.service, values })
  })

  return (
    <Show when={settings.values.length}>
      <Accordian
        title={<b>{t('x_settings', { name: ADAPTER_LABELS(t)[props.service!] })}</b>}
        titleClickOpen
        open
      >
        <For each={settings.values}>
          {(opt) => (
            <ServiceOption
              service={props.service!}
              opt={opt}
              value={opt.value}
              field={(field) => `temp.${props.service}.${field}`}
              onChange={(value) => {
                setSettings(
                  'values',
                  updateValue(settings.values, props.service!, opt.field, value)
                )
              }}
            />
          )}
        </For>
      </Accordian>
    </Show>
  )
}

export function getPresetFormData(ref: any) {
  const cfg = settingStore.getState()
  const {
    promptOrderFormat,
    promptOrder: order,
    ...data
  } = getStrictForm(ref, {
    ...presetValidator,
    thirdPartyFormat: [...THIRDPARTY_FORMATS, ''],
    useAdvancedPrompt: 'string?',
    promptOrderFormat: 'string?',
    promptOrder: 'string?',
    promptTemplateId: 'string?',
    modelFormat: 'string?',
  })

  const registered = getRegisteredSettings(data.service as AIAdapter, ref)
  data.registered = {}
  data.registered[data.service] = registered
  data.thirdPartyFormat = data.thirdPartyFormat || (null as any)

  if (data.openRouterModel) {
    const actual = cfg.config.openRouter.models.find((or) => or.id === data.openRouterModel)
    data.openRouterModel = actual || undefined
  }

  const promptOrder: AppSchema.GenSettings['promptOrder'] = order
    ? order.split(',').map((o) => {
        const [placeholder, enabled] = o.split('=')
        return { placeholder, enabled: enabled === 'on' }
      })
    : undefined

  const entries = getFormEntries(ref)
  const stopSequences = entries.reduce<string[]>((prev, [key, value]) => {
    if (key.startsWith('stop.') && value.length) {
      prev.push(value)
    }
    return prev
  }, [])

  const phraseBias = Object.values(
    entries.reduce<any>((prev, [key, value]) => {
      if (!key.startsWith('phraseBias.')) return prev
      const [, id, prop] = key.split('.')
      if (!prev[id]) prev[id] = {}
      prev[id][prop] = prop === 'seq' ? value : +value
      return prev
    }, {}) as Array<{ seq: string; bias: number }>
  ).filter((pb: any) => 'seq' in pb && 'bias' in pb)

  return { ...data, stopSequences, phraseBias, promptOrder, promptOrderFormat }
}

export function getRegisteredSettings(service: AIAdapter | undefined, ref: any) {
  if (!service) return

  const prefix = `registered.${service}.`
  const values = getFormEntries(ref).reduce((prev, [key, value]) => {
    if (!key.startsWith(prefix)) return prev
    const field = key.replace(prefix, '')

    return Object.assign(prev, { [field]: value })
  }, {})

  return values
}

const RegisteredSettings: Component<{
  service?: AIAdapter
  inherit?: Partial<AppSchema.GenSettings>
}> = (props) => {
  const state = settingStore()

  const options = createMemo(() => {
    if (!props.service) return []

    const svc = state.config.registered.find((reg) => reg.name === props.service)
    if (!svc) return []

    return svc.settings.filter((s) => s.preset)
  })

  return (
    <Show when={options().length}>
      <div class="mt-2 flex flex-col gap-2">
        <For each={options()}>
          {(opt) => (
            <ServiceOption
              opt={opt}
              service={props.service!}
              field={(field) => `registered.${props.service!}.${field}`}
              value={props.inherit?.registered?.[props.service!]?.[opt.field]}
            />
          )}
        </For>
      </div>
    </Show>
  )
}

function updateValue(values: TempSetting[], service: AIAdapter, field: string, nextValue: any) {
  storage.localSetItem(`${service}.temp.${field}`, JSON.stringify(nextValue))
  return values.map<TempSetting>((val) =>
    val.field === field ? { ...val, value: nextValue } : val
  )
}

function ensureArray(value: any): number[] {
  if (!value) return []
  if (typeof value === 'string') {
    return value
      .split(',')
      .filter((v) => v !== '')
      .map((v) => +v)
  }

  return value.map((v: any) => (typeof v === 'number' ? v : +v)).filter((v: number) => isNaN(v))
}
