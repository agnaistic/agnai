import { Component, createMemo, createSignal, For, JSX, Show } from 'solid-js'
import RangeInput from './RangeInput'
import TextInput from './TextInput'
import Select, { Option } from './Select'
import { AppSchema } from '../../srv/db/schema'
import { defaultPresets } from '../../common/presets'
import {
  OPENAI_MODELS,
  CLAUDE_MODELS,
  ADAPTER_LABELS,
  AIAdapter,
  NOVEL_MODELS,
  REPLICATE_MODEL_TYPES,
  OPENAI_CHAT_MODELS,
} from '../../common/adapters'
import Divider from './Divider'
import { Toggle } from './Toggle'
import { Check, X } from 'lucide-solid'
import { settingStore } from '../store'
import PromptEditor from './PromptEditor'
import { Card } from './Card'
import { FormLabel } from './FormLabel'

type Props = {
  inherit?: Partial<AppSchema.GenSettings>
  disabled?: boolean
  service?: AIAdapter
  onService?: (service?: AIAdapter) => void
  disableService?: boolean
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
            disabled={props.disableService}
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
  const allAdapaters = ['kobold', 'novel', 'ooba', 'horde', 'luminai', 'openai', 'scale']
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
  return (
    <div class="flex flex-col gap-2">
      <div class="text-xl font-bold">General Settings</div>

      <Card class="flex flex-wrap gap-5">
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
          fieldName="novelModel"
          label="NovelAI Model"
          items={[
            ...modelsToItems(NOVEL_MODELS).map(({ value }) => ({ label: value, value })),
            { value: '', label: 'Use service default' },
          ]}
          helperText="Which NovelAI model to use"
          value={props.inherit?.novelModel || ''}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'novelModel'}
        />

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

        <Select
          fieldName="replicateModelType"
          label="Replicate Model Type"
          items={modelsToItems(REPLICATE_MODEL_TYPES)}
          helperText="Which Replicate API input parameters to use"
          value={
            props.inherit?.replicateModelType ??
            defaultPresets.replicate_vicuna_13b.replicateModelType
          }
          disabled={props.disabled}
          service={props.service}
          aiSetting={'replicateModelType'}
        />

        <TextInput
          fieldName="replicateModelType"
          label="Replicate Model Type"
          helperText="Which Replicate model to use (see https://replicate.com/collections/language-models)"
          value={
            props.inherit?.replicateModelVersion ??
            defaultPresets.replicate_vicuna_13b.replicateModelVersion
          }
          disabled={props.disabled}
          service={props.service}
          aiSetting={'replicateModelVersion'}
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
        />
      </Card>
      <Card>
        <Toggle
          fieldName="streamResponse"
          label="Stream Response"
          helperText="Whether to stream the AI's response token-by-token instead of waiting for the entire message."
          value={props.inherit?.streamResponse ?? false}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'streamResponse'}
        />
      </Card>
    </div>
  )
}

const modelsToItems = (models: Record<string, string>): Option<string>[] =>
  Object.entries(models).map(([label, value]) => ({ label, value }))

const PromptSettings: Component<Props> = (props) => {
  const cfg = settingStore((cfg) => cfg.flags)

  // Services that use chat completion cannot use the template parser
  const canUseParser =
    props.inherit?.service !== 'openai' && (props.inherit?.oaiModel || '') in OPENAI_CHAT_MODELS

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
      <Card class="flex flex-col gap-4">
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
      <Card class="flex flex-col gap-4">
        <FormLabel label="System Prompt" />
        <PromptEditor
          fieldName="systemPrompt"
          include={['char', 'user', 'chat_age', 'idle_duration']}
          value={props.inherit?.systemPrompt ?? ''}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'systemPrompt'}
          // class="form-field focusable-field text-900 min-h-[8rem] w-full rounded-xl px-4 py-2 text-sm"
        />

        <Show when={cfg.parser && canUseParser}>
          <Toggle
            fieldName="useTemplateParser"
            value={props.inherit?.useTemplateParser}
            label="Use Template Parser (Experimental)"
          />
        </Show>

        <PromptEditor
          fieldName="gaslight"
          value={props.inherit?.gaslight}
          exclude={['post', 'history', 'ujb']}
          disabled={props.disabled}
          showHelp
        />
        <TextInput
          fieldName="ultimeJailbreak"
          label="UJB Prompt (GPT-4 / Turbo / Claude)"
          helperText={
            <>
              (Leave empty to disable)
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
          aiSetting={'gaslight'}
        />
        <div class="flex flex-wrap gap-4">
          <Toggle
            fieldName="ignoreCharacterSystemPrompt"
            label="Override character system prompt"
            value={props.inherit?.ignoreCharacterSystemPrompt ?? false}
            disabled={props.disabled}
            service={props.service}
            aiSetting={'ignoreCharacterSystemPrompt'}
          />
          <Toggle
            fieldName="ignoreCharacterUjb"
            label="Override character UJB"
            value={props.inherit?.ignoreCharacterUjb ?? false}
            disabled={props.disabled}
            service={props.service}
            aiSetting={'ignoreCharacterUjb'}
          />
        </div>
      </Card>
      <Card>
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
      </Card>
    </div>
  )
}
