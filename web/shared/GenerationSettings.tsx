import { Component, createMemo, createSignal, For, JSX, onMount, Show } from 'solid-js'
import RangeInput from './RangeInput'
import TextInput from './TextInput'
import Select, { Option } from './Select'
import { AppSchema } from '../../common/types/schema'
import { defaultPresets } from '../../common/presets'
import {
  OPENAI_MODELS,
  CLAUDE_MODELS,
  ADAPTER_LABELS,
  AIAdapter,
  NOVEL_MODELS,
  REPLICATE_MODEL_TYPES,
  samplerOrders,
  settingLabels,
} from '../../common/adapters'
import Divider from './Divider'
import { Toggle } from './Toggle'
import { Check, X } from 'lucide-solid'
import { presetStore, settingStore } from '../store'
import PromptEditor from './PromptEditor'
import { Card } from './Card'
import { FormLabel } from './FormLabel'
import { serviceHasSetting } from './util'
import { createStore } from 'solid-js/store'
import { defaultTemplate } from '/common/templates'
import Sortable, { SortItem } from './Sortable'
import { HordeDetails } from '../pages/Settings/components/HordeAISettings'

type Props = {
  inherit?: Partial<AppSchema.GenSettings>
  disabled?: boolean
  service?: AIAdapter
  onService?: (service?: AIAdapter) => void
  disableService?: boolean
  saveToChatId?: string
}

const GenerationSettings: Component<Props> = (props) => {
  const state = settingStore((s) => s.config)

  const [service, setService] = createSignal(props.inherit?.service)

  const services = createMemo<Option[]>(() => {
    const list = state.adapters.map((adp) => ({ value: adp, label: ADAPTER_LABELS[adp] }))
    if (props.inherit?.service) return list

    return [{ value: '', label: 'None' }].concat(list)
  })

  const onServiceChange = (opt: Option<string>) => {
    setService(opt.value as any)
    props.onService?.(opt.value as any)
  }

  return (
    <>
      <div class="flex flex-col gap-6">
        <Card>
          <Select
            fieldName="service"
            label="AI Service"
            helperText={
              <>
                <Show when={!service()}>
                  <p class="text-red-500">
                    Warning! Your preset does not currently have a service set.
                  </p>
                </Show>
                <p>This will take precedence over the adapter being set anywhere else.</p>
              </>
            }
            value={props.inherit?.service || ''}
            items={services()}
            onChange={onServiceChange}
            disabled={props.disabled || props.disableService}
          />
        </Card>
        <GeneralSettings disabled={props.disabled} inherit={props.inherit} service={service()} />
        <PromptSettings disabled={props.disabled} inherit={props.inherit} service={service()} />
        <GenSettings disabled={props.disabled} inherit={props.inherit} service={service()} />
      </div>
    </>
  )
}
export default GenerationSettings

export function CreateTooltip(adapters: string[] | readonly string[]): JSX.Element {
  const allAdapaters = ['kobold', 'novel', 'ooba', 'horde', 'openai', 'scale']
  return (
    <div>
      <For each={allAdapaters}>
        {(adapter) => (
          <div class="flex flex-row gap-2">
            <Show when={adapters.includes(adapter)}>
              <div class="text-green-500">
                <Check />
              </div>
            </Show>
            <Show when={!adapters.includes(adapter)}>
              <div class="text-red-500">
                <X />
              </div>
            </Show>
            {adapter}
          </div>
        )}
      </For>
    </div>
  )
}

const GeneralSettings: Component<Props> = (props) => {
  const cfg = settingStore()
  const presets = presetStore()

  const [replicate, setReplicate] = createStore({
    model: props.inherit?.replicateModelName,
    type: props.inherit?.replicateModelType,
    version: props.inherit?.replicateModelVersion,
  })

  const [tokens, setTokens] = createSignal(
    props.inherit?.maxTokens || defaultPresets.basic.maxTokens
  )

  const [context, setContext] = createSignal(
    props.inherit?.maxContextLength || defaultPresets.basic.maxContextLength
  )

  const openRouterModels = createMemo(() => {
    if (!presets.openRouterModels) return []

    const options = presets.openRouterModels.map((model) => ({
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

  onMount(() => {
    presetStore.getOpenRouterModels()
  })

  return (
    <div class="flex flex-col gap-2">
      <div class="text-xl font-bold">General Settings</div>

      <Show when={props.service === 'horde'}>
        <Card>
          <HordeDetails maxTokens={tokens()} maxContextLength={context()} />
        </Card>
      </Show>

      <Card hide={!serviceHasSetting(props.service, 'thirdPartyUrl')}>
        <TextInput
          fieldName="thirdPartyUrl"
          label="Third Party URL"
          helperText="Typically a Kobold, Ooba, or other URL"
          value={props.inherit?.thirdPartyUrl || ''}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'thirdPartyUrl'}
        />

        <Select
          fieldName="thirdPartyFormat"
          label="Kobold / 3rd-party Format"
          helperText="Re-formats the prompt to the desired output format."
          items={[
            { label: 'None', value: '' },
            { label: 'Kobold/Ooba', value: 'kobold' },
            { label: 'OpenAI', value: 'openai' },
            { label: 'Claude', value: 'claude' },
          ]}
          value={props.inherit?.thirdPartyFormat ?? ''}
          service={props.service}
          aiSetting={'thirdPartyFormat'}
        />
      </Card>

      <Card
        class="flex flex-wrap gap-5"
        hide={
          !serviceHasSetting(
            props.service,
            'oaiModel',
            'openRouterModel',
            'novelModel',
            'claudeModel',
            'replicateModelName'
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
          aiSetting={'oaiModel'}
        />

        <Select
          fieldName="openRouterModel"
          label="OpenRouter Model"
          items={openRouterModels()}
          helperText="Which OpenRouter model to use"
          value={props.inherit?.openRouterModel?.id || ''}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'openRouterModel'}
        />

        <div class="flex flex-wrap gap-2">
          <Select
            fieldName="novelModel"
            label="NovelAI Model"
            items={novelModels()}
            helperText="Which NovelAI model to use"
            value={props.inherit?.novelModel || ''}
            disabled={props.disabled}
            service={props.service}
            aiSetting={'novelModel'}
          />
          <Show when={cfg.flags.naiModel}>
            <TextInput
              fieldName="novelModelOverride"
              helperText="Advanced: Use a custom NovelAI model"
              label="NovelAI Model Override"
              aiSetting={'novelModel'}
              service={props.service}
            />
          </Show>
        </div>

        <Select
          fieldName="claudeModel"
          label="Claude Model"
          items={modelsToItems(CLAUDE_MODELS)}
          helperText="Which Claude model to use"
          value={props.inherit?.claudeModel ?? defaultPresets.claude.claudeModel}
          disabled={props.disabled}
          service={props.service}
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
          onInput={(ev) => setReplicate('version', ev.currentTarget.value)}
        />
      </Card>

      <Card>
        <RangeInput
          fieldName="maxTokens"
          label="Max New Tokens"
          helperText="Number of tokens the AI should generate. Higher numbers will take longer to generate. This value is subtracted from your context limit."
          min={16}
          max={1024}
          step={1}
          value={props.inherit?.maxTokens || defaultPresets.basic.maxTokens}
          disabled={props.disabled}
          onChange={(val) => setTokens(val)}
        />
        <RangeInput
          fieldName="maxContextLength"
          label="Max Context Length"
          helperText={
            <>
              <p>
                Maximum context length. Typically 2048 for most models. OpenAI Turbo and Davinci
                supports up to 4K. Scale and Claude support up to 8K. OpenAI GPT4-32k supports 32k.
                If you set this too high, you may get unexpected results or errors.
              </p>
              <p>
                We don't have GPT-4 or Claude tokenizers to correctly count tokens for those
                services. Therefore we can't precisely count tokens when generating a prompt. Keep
                this well below 8K to ensure you don't exceed the limit.
              </p>
              <p>
                Claude models with "100k" in the name support up to 100k tokens, but the same
                caveats apply, we recommend setting a 80k limit.
              </p>
            </>
          }
          min={16}
          max={props.service === 'claude' ? 100000 : 32000}
          step={1}
          value={props.inherit?.maxContextLength || defaultPresets.basic.maxContextLength}
          disabled={props.disabled}
          onChange={(val) => setContext(val)}
        />
      </Card>
      <Card hide={!serviceHasSetting(props.service, 'streamResponse')}>
        <Toggle
          fieldName="streamResponse"
          label="Stream Response"
          helperText="Whether to stream the AI's response token-by-token instead of waiting for the entire message."
          value={props.inherit?.streamResponse ?? false}
          disabled={props.disabled}
        />
      </Card>
    </div>
  )
}

function modelsToItems(models: Record<string, string>): Option<string>[] {
  const pairs = Object.entries(models).map(([label, value]) => ({ label, value }))
  return pairs
}

const PromptSettings: Component<Props> = (props) => {
  return (
    <div class="flex flex-col gap-4">
      <div class="text-xl font-bold">Prompt Settings</div>
      <Card class="flex flex-col gap-4">
        <RangeInput
          fieldName="memoryContextLimit"
          label="Memory: Context Limit"
          helperText="The maximum context length (in tokens) for the memory prompt."
          min={1}
          // No idea what the max should be
          max={2000}
          step={1}
          value={props.inherit?.memoryContextLimit || defaultPresets.basic.memoryContextLimit}
          disabled={props.disabled}
        />

        <RangeInput
          fieldName="memoryChatEmbedLimit"
          label="Memory: Chat Embedding Context Limit"
          helperText="If available: The maximum context length (in tokens) for chat history embeddings."
          min={1}
          max={10000}
          step={1}
          value={props.inherit?.memoryChatEmbedLimit || defaultPresets.basic.memoryContextLimit}
          disabled={props.disabled}
        />

        <RangeInput
          fieldName="memoryUserEmbedLimit"
          label="Memory: User-specified Embedding Context Limit"
          helperText="If available: The maximum context length (in tokens) for user-specified embeddings."
          min={1}
          max={10000}
          step={1}
          value={props.inherit?.memoryUserEmbedLimit || defaultPresets.basic.memoryContextLimit}
          disabled={props.disabled}
        />

        <RangeInput
          fieldName="memoryDepth"
          label="Memory: Chat History Depth"
          helperText="How far back in the chat history to look for keywords."
          min={1}
          max={100}
          step={1}
          value={props.inherit?.memoryDepth || defaultPresets.basic.memoryDepth}
          disabled={props.disabled}
        />
      </Card>
      <Card class="flex flex-col gap-4" hide={!serviceHasSetting(props.service, 'gaslight')}>
        <Toggle
          fieldName="useGaslight"
          label="Use Gaslight"
          helperText={
            <>
              If this option is enabled, the Gaslight text will be included in the prompt sent to
              the AI service.
              <p class="font-bold">
                CAUTION: By using the gaslight, you assume full control of the prompt "pre-amble".
                If you do not include the placeholders, they will not be included in the prompt at
                all.
              </p>
            </>
          }
          value={props.inherit?.useGaslight ?? false}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'gaslight'}
        />
      </Card>
      <Card class="flex flex-col gap-4" hide={!serviceHasSetting(props.service, 'systemPrompt')}>
        <FormLabel
          label="System Prompt"
          helperText="General instructions for how the AI should respond. This will be inserted into your Prompt Template."
        />
        <PromptEditor
          fieldName="systemPrompt"
          include={['char', 'user']}
          placeholder="Write {{char}}'s next reply in a fictional chat between {{char}} and {{user}}. Write 1 reply only in internet RP style, italicize actions, and avoid quotation marks. Use markdown. Be proactive, creative, and drive the plot and conversation forward. Write at least 1 paragraph, up to 4. Always stay in character and avoid repetition."
          value={props.inherit?.systemPrompt ?? ''}
          disabled={props.disabled}
          aiSetting="gaslight"
        />
      </Card>

      <Card class="flex flex-col gap-4">
        {/* <Toggle
          fieldName="useTemplateParser"
          value={props.inherit?.useTemplateParser}
          label="Use Template Parser (Experimental)"
          helperText="This will override your prompt. The V2 parser supports additional placeholders (#each, #if, random, roll, ...)."
          onChange={(v) => setV2(v)}
        /> */}

        <PromptEditor
          fieldName="gaslight"
          value={props.inherit?.gaslight}
          placeholder={defaultTemplate}
          exclude={['post', 'history', 'ujb']}
          disabled={props.disabled}
          showHelp
          inherit={props.inherit}
          v2
        />
        <TextInput
          fieldName="ultimeJailbreak"
          label="Jailbreak (UJB) Prompt (GPT-4 / Turbo / Claude)"
          helperText={
            <>
              (Typically used for Instruct models like Turbo, GPT-4, and Claude. Leave empty to
              disable)
              <br /> Ultimate Jailbreak. If this option is enabled, the UJB prompt will sent as a
              system message at the end of the conversation before prompting OpenAI or Claude.
            </>
          }
          placeholder="E.g. Keep OOC out of your reply."
          isMultiline
          value={props.inherit?.ultimeJailbreak ?? ''}
          disabled={props.disabled}
          service={props.service}
          class="form-field focusable-field text-900 min-h-[8rem] w-full rounded-xl px-4 py-2 text-sm"
          aiSetting={'ultimeJailbreak'}
        />
        <div class="flex flex-wrap gap-4">
          <Toggle
            fieldName="ignoreCharacterSystemPrompt"
            label="Override Character System Prompt"
            value={props.inherit?.ignoreCharacterSystemPrompt ?? false}
            disabled={props.disabled}
            service={props.service}
            aiSetting={'ignoreCharacterSystemPrompt'}
          />
          <Toggle
            fieldName="ignoreCharacterUjb"
            label="Override Character Jailbreak"
            value={props.inherit?.ignoreCharacterUjb ?? false}
            disabled={props.disabled}
            service={props.service}
            aiSetting={'ignoreCharacterUjb'}
          />
        </div>
      </Card>
      <Card hide={!serviceHasSetting(props.service, 'antiBond')}>
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
          aiSetting={'antiBond'}
        />
      </Card>
    </div>
  )
}

const GenSettings: Component<Props> = (props) => {
  const [_useV2, _setV2] = createSignal(props.inherit?.useTemplateParser ?? false)

  return (
    <div class="flex flex-col gap-4">
      <div class="text-xl font-bold">Generation Settings</div>

      <Card class="flex flex-col gap-4">
        <RangeInput
          fieldName="temp"
          label="Temperature"
          helperText="Randomness of sampling. High values can increase creativity but may make text less sensible. Lower values will make text more predictable but can become repetitious."
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
          label="CFG Scale (Clio only)"
          helperText={
            <>
              Classifier Free Guidance. See{' '}
              <a href="https://docs.novelai.net/text/cfg.html" target="_blank" class="link">
                NovelAI's CFG docs
              </a>{' '}
              for more information.
              <br />
              Set to 1 to disable.
            </>
          }
          min={1}
          max={3}
          step={0.05}
          value={props.inherit?.cfgScale || 1}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'cfgScale'}
        />

        <TextInput
          fieldName="cfgOppose"
          label="CFG Opposing Prompt (Clio only)"
          helperText={
            <>
              A prompt that would generate the opposite of what you want. Leave empty if unsure.
              Classifier Free Guidance. See{' '}
              <a href="https://docs.novelai.net/text/cfg.html" target="_blank" class="link">
                NovelAI's CFG docs
              </a>{' '}
              for more information.
            </>
          }
          value={props.inherit?.cfgOppose || ''}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'cfgScale'}
        />

        <RangeInput
          fieldName="topP"
          label="Top P"
          helperText="Used to discard unlikely text in the sampling process. Lower values will make text more predictable but can become repetitious. (Put this value on 1 to disable its effect)"
          min={0}
          max={1}
          step={0.01}
          value={props.inherit?.topP ?? defaultPresets.basic.topP}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'topP'}
        />
        <RangeInput
          fieldName="topK"
          label="Top K"
          helperText="Alternative sampling method, can be combined with top_p. The number of highest probability vocabulary tokens to keep for top-k-filtering. (Put this value on 0 to disable its effect)"
          min={0}
          max={100}
          step={1}
          value={props.inherit?.topK ?? defaultPresets.basic.topK}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'topK'}
        />
        <RangeInput
          fieldName="topA"
          label="Top A"
          helperText="Increases the consistency of the output by removing unlikely tokens based on the highest token probability. (Put this value on 1 to disable its effect)"
          min={0}
          max={1}
          step={0.01}
          value={props.inherit?.topA ?? defaultPresets.basic.topA}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'topA'}
        />
        <RangeInput
          fieldName="tailFreeSampling"
          label="Tail Free Sampling"
          helperText="Increases the consistency of the output by working from the bottom and trimming the lowest probability tokens. (Put this value on 1 to disable its effect)"
          min={0}
          max={1}
          step={0.001}
          value={props.inherit?.tailFreeSampling ?? defaultPresets.basic.tailFreeSampling}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'tailFreeSampling'}
        />
        <RangeInput
          fieldName="typicalP"
          label="Typical P"
          helperText="Selects tokens according to the expected amount of information they contribute. Set this setting to 1 to disable its effect."
          min={0}
          max={1}
          step={0.01}
          value={props.inherit?.typicalP ?? defaultPresets.basic.typicalP}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'typicalP'}
        />
        <RangeInput
          fieldName="repetitionPenalty"
          label="Repetition Penalty"
          helperText="Used to penalize words that were already generated or belong to the context (Going over 1.2 breaks 6B models. Set to 1.0 to disable)."
          min={0}
          max={3}
          step={0.01}
          value={props.inherit?.repetitionPenalty ?? defaultPresets.basic.repetitionPenalty}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'repetitionPenalty'}
        />
        <RangeInput
          fieldName="repetitionPenaltyRange"
          label="Repetition Penalty Range"
          helperText="How many tokens will be considered repeated if they appear in the next output."
          min={0}
          max={2048}
          step={1}
          value={
            props.inherit?.repetitionPenaltyRange ?? defaultPresets.basic.repetitionPenaltyRange
          }
          disabled={props.disabled}
          service={props.service}
          aiSetting={'repetitionPenaltyRange'}
        />
        <RangeInput
          fieldName="repetitionPenaltySlope"
          label="Repetition Penalty Slope"
          helperText="Affects the ramping of the penalty's harshness, starting from the final token. (Set to 0.0 to disable)"
          min={0}
          max={10}
          step={0.01}
          value={
            props.inherit?.repetitionPenaltySlope ?? defaultPresets.basic.repetitionPenaltySlope
          }
          disabled={props.disabled}
          service={props.service}
          aiSetting={'repetitionPenaltySlope'}
        />
        <Show when={!props.service}>
          <Divider />
          <div class="text-2xl"> OpenAI</div>
        </Show>
        <RangeInput
          fieldName="frequencyPenalty"
          label="Frequency Penalty"
          helperText="Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim."
          min={-2.0}
          max={2.0}
          step={0.01}
          value={props.inherit?.frequencyPenalty ?? defaultPresets.openai.frequencyPenalty}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'frequencyPenalty'}
        />
        <RangeInput
          fieldName="presencePenalty"
          label="Presence Penalty"
          helperText="Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics."
          min={-2.0}
          max={2.0}
          step={0.01}
          value={props.inherit?.presencePenalty ?? defaultPresets.openai.presencePenalty}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'presencePenalty'}
        />
        <Show when={!props.service}>
          <Divider />
          <div class="text-2xl">TextGen / Ooba</div>
        </Show>
        <Toggle
          fieldName="addBosToken"
          label="Add BOS Token"
          helperText="Add begining of sequence token to the start of prompt. Disabling makes the replies more creative."
          value={props.inherit?.addBosToken ?? true}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'addBosToken'}
        />
        <Toggle
          fieldName="banEosToken"
          label="Ban EOS Token"
          helperText="Ban the end of sequence token. This forces the model to never end the generation prematurely."
          value={props.inherit?.banEosToken ?? false}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'banEosToken'}
        />
        <Toggle
          fieldName="skipSpecialTokens"
          label="Skip Special Tokens"
          helperText="Some specific models need this unset."
          value={props.inherit?.skipSpecialTokens ?? true}
          disabled={props.disabled}
          service={props.service}
          aiSetting="skipSpecialTokens"
        />
        <RangeInput
          fieldName="encoderRepitionPenalty"
          label="Encoder Repition Penalty"
          helperText="Also known as the 'Hallucinations filter'. Used to penalize tokens that are *not* in the prior text. Higher value = more likely to stay in context, lower value = more likely to diverge"
          min={0.8}
          max={1.5}
          step={0.01}
          value={
            props.inherit?.encoderRepitionPenalty ?? defaultPresets.basic.encoderRepitionPenalty
          }
          disabled={props.disabled}
          service={props.service}
          aiSetting={'encoderRepitionPenalty'}
        />
        <RangeInput
          fieldName="penaltyAlpha"
          label="Penalty Alpha"
          helperText="The values balance the model confidence and the degeneration penalty in contrastive search decoding"
          min={0}
          max={5}
          step={0.01}
          value={props.inherit?.penaltyAlpha ?? defaultPresets.basic.penaltyAlpha}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'penaltyAlpha'}
        />

        <Show when={false}>
          <SamplerOrder service={props.service} order={[]} setOrder={() => {}} />
        </Show>
      </Card>
    </div>
  )
}

const SamplerOrder: Component<{
  service?: AIAdapter
  order: number[]
  setOrder: (order: number[]) => void
}> = (props) => {
  const items = createMemo(() => {
    const list: SortItem[] = []
    if (!props.service) return list

    const order = samplerOrders[props.service]
    if (!order) return []

    let id = 0
    for (const item of order) {
      list.push({
        id: id++,
        label: settingLabels[item]!,
      })
    }

    return list
  })

  return <Sortable label="Sampler Order" items={items()} onChange={props.setOrder} />
}
