import { Component, createSignal, Show } from 'solid-js'
import RangeInput from './RangeInput'
import TextInput from './TextInput'
import Dropdown from './Dropdown'
import { AppSchema } from '../../srv/db/schema'
import { defaultPresets } from '../../common/presets'
import { OPENAI_MODELS } from '../../common/adapters'
import Divider from './Divider'
import { Toggle } from './Toggle'
import Tabs from './Tabs'

type Props = {
  inherit?: Partial<AppSchema.GenSettings>
  disabled?: boolean
  showAll?: boolean
}

const GenerationSettings: Component<Props> = (props) => {
  const tabs = ['General', 'Prompt', 'Generation'] as const
  const [tab, setTab] = createSignal(0)

  return (
    <>
      <Show when={!props.showAll}>
        <Tabs tabs={tabs} select={setTab} selected={tab} />
      </Show>

      <div class="flex flex-col gap-4">
        <Section show={props.showAll || tabs[tab()] === 'General'}>
          <GeneralSettings disabled={props.disabled} inherit={props.inherit} />
        </Section>

        <Section show={props.showAll || tabs[tab()] === 'Prompt'}>
          <PromptSettings disabled={props.disabled} inherit={props.inherit} />
        </Section>

        <Section show={props.showAll || tabs[tab()] === 'Generation'}>
          <GeneSettings disabled={props.disabled} inherit={props.inherit} />
        </Section>
      </div>
    </>
  )
}
export default GenerationSettings

type SectProps = { show: boolean; children: any }

const Section: Component<SectProps> = (props) => (
  <div class={`flex-col gap-4 ${props.show ? 'flex' : 'hidden'}`}>{props.children}</div>
)

const GeneralSettings: Component<Props> = (props) => {
  return (
    <>
      <Divider />
      <div class="text-xl font-bold">General Settings</div>
      <RangeInput
        fieldName="maxTokens"
        label="Max New Tokens"
        helperText="Number of tokens the AI should generate. Higher numbers will take longer to generate."
        min={16}
        max={512}
        step={4}
        value={props.inherit?.maxTokens || defaultPresets.basic.maxTokens}
        disabled={props.disabled}
      />

      <RangeInput
        fieldName="maxContextLength"
        label="Max Context Length"
        helperText={
          <>
            <p>
              Maximum context length. Typically 2048 for most models. OpenAI supports up to 4K.
              Scale supports up to 8K. If you set this too high, you may get unexpected results or
              errors.
            </p>
            <p>
              We don't have a GPT-4 tokenizer to correctly count tokens for GPT-4 services.
              Therefore we can't precisely count tokens when generating a prompt. Keep this well
              below 8K to ensure you don't exceed the limit.
            </p>
          </>
        }
        min={16}
        max={8000}
        step={4}
        value={props.inherit?.maxContextLength || defaultPresets.basic.maxContextLength}
        disabled={props.disabled}
      />
      <Dropdown
        fieldName="oaiModel"
        label="OpenAI Model"
        items={Object.entries(OPENAI_MODELS).map(([label, value]) => ({ label, value }))}
        helperText="Which OpenAI model to use"
        value={props.inherit?.oaiModel}
        disabled={props.disabled}
      />
    </>
  )
}

const PromptSettings: Component<Props> = (props) => {
  return (
    <>
      <Divider />
      <div class="text-xl font-bold">Prompt Settings</div>
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

      {/* <Toggle
        fieldName="useGaslight"
        label="Use Gaslight"
        helperText="If this option is enable, the Gaslight text will be included in the prompt sent to the AI service. Particularly useful for Scale."
        value={props.inherit?.useGaslight ?? false}
      /> */}

      <TextInput
        fieldName="gaslight"
        label="Gaslight Prompt (OpenAI / Scale)"
        helperText="How the character definitions are sent to OpenAI. Placeholders: {{char}} {{user}} {{personality}} {{memory}} {{example_dialogue}}. If {{example_dialogue}} is not present then example dialogues will be sent as conversation history."
        placeholder="Be sure to include "
        isMultiline
        value={props.inherit?.gaslight ?? defaultPresets.openai.gaslight}
        disabled={props.disabled}
      />
    </>
  )
}

const GeneSettings: Component<Props> = (props) => {
  return (
    <>
      <Divider />
      <div class="text-xl font-bold">Generation Settings</div>
      <RangeInput
        fieldName="temp"
        label="Temperature"
        helperText="Randomness of sampling. High values can increase creativity but may make text less sensible. Lower values will make text more predictable but can become repetitious."
        min={0.1}
        max={20}
        step={0.01}
        value={props.inherit?.temp || defaultPresets.basic.temp}
        disabled={props.disabled}
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
      />
      <RangeInput
        fieldName="repetitionPenaltyRange"
        label="Repetition Penalty Range"
        helperText="How many tokens will be considered repeated if they appear in the next output."
        min={0}
        max={2048}
        step={1}
        value={props.inherit?.repetitionPenaltyRange ?? defaultPresets.basic.repetitionPenaltyRange}
        disabled={props.disabled}
      />
      <RangeInput
        fieldName="repetitionPenaltySlope"
        label="Repetition Penalty Slope"
        helperText="Affects the ramping of the penalty's harshness, starting from the final token. (Set to 0.0 to disable)"
        min={0}
        max={10}
        step={0.01}
        value={props.inherit?.repetitionPenaltySlope ?? defaultPresets.basic.repetitionPenaltySlope}
        disabled={props.disabled}
      />
      <Toggle
        fieldName="useGaslight"
        label="Use Gaslight"
        helperText="If not used models will be prompted in the following format: {{name}}'s Persona{{personality}}\nScenario{{scenario}}\n{{example_dialogue}}\n{{memory}}<START>{{conversation}}"
        value={props.inherit?.useGaslight ?? defaultPresets.basic.useGaslight}
      />
      <TextInput
        fieldName="gaslight"
        label="Gaslight Prompt"
        helperText="How the character definitions are sent to the backend. Placeholders: {{char}} {{user}} {{personality}} {{example_dialogue}} {{memory}}. If {{example_dialogue}} is not present then example dialogues will be sent as conversation history."
        placeholder="Enter roleplay mode. You will write {{char}}'s next reply in a dialogue between {{char}} and {{user}}. Do not decide what {{user}} says or does. Use Internet roleplay style, e.g. no quotation marks, and write user actions in italic in third person like: *he jumps in excitement*. You are allowed to use markdown. Be proactive, creative, drive the plot and conversation forward. Write at least one paragraph, up to four. Always stay in character. Always keep the conversation going. (Repetition is highly discouraged)\nAvoid writing a NSFW/Smut reply. Creatively write around it NSFW/Smut scenarios in character.\n\nDescription of {{char}}:\n{{personality}}\nCircumstances and context of the dialogue: {{scenario}}\nThis is how {{char}} should talk\n{{example_dialogue}}"
        isMultiline
        value={props.inherit?.gaslight ?? defaultPresets.basic.gaslight}
        disabled={props.disabled}
      />
      <Divider />
      <div class="text-2xl"> OpenAI</div>
      <RangeInput
        fieldName="frequencyPenalty"
        label="Frequency Penalty"
        helperText="Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim."
        min={-2.0}
        max={2.0}
        step={0.01}
        value={props.inherit?.frequencyPenalty ?? defaultPresets.openai.frequencyPenalty}
        disabled={props.disabled}
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
      />
    </>
  )
}
