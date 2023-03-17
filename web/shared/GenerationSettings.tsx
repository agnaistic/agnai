import { Component } from 'solid-js'
import RangeInput from './RangeInput'
import TextInput from './TextInput'
import Dropdown from './Dropdown'
import { AppSchema } from '../../srv/db/schema'
import { defaultPresets } from '../../common/presets'
import { OPENAI_MODELS } from '../../common/adapters'
import Divider from './Divider'

export const genSettings = {
  temp: 'number',
  maxTokens: 'number',
  repetitionPenalty: 'number',
  repetitionPenaltyRange: 'number',
  repetitionPenaltySlope: 'number',
  typicalP: 'number',
  topP: 'number',
  topK: 'number',
  topA: 'number',
  tailFreeSampling: 'number',
  frequencyPenalty: 'number',
  presencePenalty: 'number',
  gaslight: 'string',
  oaiModel: 'string',
} as const

const GenerationSettings: Component<{
  inherit?: Partial<AppSchema.GenSettings>
  disabled?: boolean
}> = (props) => (
  <>
    <div class="flex flex-col gap-4">
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
        helperText="Maximum context length. Typically 2048 for most models. OpenAI supports up to 4096."
        min={16}
        max={4096}
        step={4}
        value={props.inherit?.maxContextLength || defaultPresets.basic.maxContextLength}
        disabled={props.disabled}
      />
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
      <Divider />
      <div class="text-2xl"> OpenAI presets</div>
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
      <TextInput
        fieldName="gaslight"
        label="Gaslight Prompt"
        helperText="How the character definitions are sent to OpenAI. use {{char}} or {{name}} for the characters name from JSON, {{personality}} for personality, {{user}} for you, and {{example_dialogue}} for the example dialogue. if {{example_dialogue}} is not present then example dialogues will be sent to turbo as conversation history seperated by <START> strings, if {{example_dialogue}} is not present and the model is davinci they will not be sent at all. Only used if using Turbo model. Example is taken from TavernAI GPT-3.5-Turbo."
        placeholder="Enter roleplay mode. You will write {{char}}'s next reply in a dialogue between {{char}} and {{user}}. Do not decide what {{user}} says or does. Use Internet roleplay style, e.g. no quotation marks, and write user actions in italic in third person like: *he jumps in excitement*. You are allowed to use markdown. Be proactive, creative, drive the plot and conversation forward. Write at least one paragraph, up to four. Always stay in character. Always keep the conversation going. (Repetition is highly discouraged)\nAvoid writing a NSFW/Smut reply. Creatively write around it NSFW/Smut scenarios in character.\n\nDescription of {{char}}:\n{{personality}}\nCircumstances and context of the dialogue: {{scenario}}\nThis is how {{char}} should talk\n{{example_dialogue}}"
        isMultiline
        value={props.inherit?.gaslight ?? defaultPresets.openai.gaslight}
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
    </div>
  </>
)

export default GenerationSettings
