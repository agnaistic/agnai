import { Component } from 'solid-js'
import RangeInput from '../shared/RangeInput'
import { AppSchema } from '../../srv/db/schema'
import { presets } from '../../common/presets'

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
} as const

const GenerationSettings: Component<{ inherit?: AppSchema.Chat['genSettings'] }> = (props) => (
  <>
    <div class="flex flex-col gap-4">
      <RangeInput
        fieldName="maxTokens"
        label="Max New Tokens"
        helperText="Number of tokens the AI should generate. Higher numbers will take longer to generate."
        min={16}
        max={512}
        step={4}
        value={props.inherit?.maxTokens || presets.basic.maxTokens}
      />
      <RangeInput
        fieldName="temp"
        label="Temperature"
        helperText="Randomness of sampling. High values can increase creativity but may make text less sensible. Lower values will make text more predictable but can become repetitious."
        min={0.1}
        max={20}
        step={0.01}
        value={props.inherit?.temp || presets.basic.temp}
      />
      <RangeInput
        fieldName="topP"
        label="Top P"
        helperText="Used to discard unlikely text in the sampling process. Lower values will make text more predictable but can become repetitious. (Put this value on 1 to disable its effect)"
        min={0}
        max={1}
        step={0.01}
        value={props.inherit?.topP ?? presets.basic.topP}
      />
      <RangeInput
        fieldName="topK"
        label="Top K"
        helperText="Alternative sampling method, can be combined with top_p. The number of highest probability vocabulary tokens to keep for top-k-filtering. (Put this value on 0 to disable its effect)"
        min={0}
        max={100}
        step={1}
        value={props.inherit?.topK ?? presets.basic.topK}
      />
      <RangeInput
        fieldName="topA"
        label="Top A"
        helperText="Increases the consistency of the output by removing unlikely tokens based on the highest token probability. (Put this value on 1 to disable its effect)"
        min={0}
        max={1}
        step={0.01}
        value={props.inherit?.topA ?? presets.basic.topA}
      />
      <RangeInput
        fieldName="tailFreeSampling"
        label="Tail Free Sampling"
        helperText="Increases the consistency of the output by working from the bottom and trimming the lowest probability tokens. (Put this value on 1 to disable its effect)"
        min={0}
        max={1}
        step={0.001}
        value={props.inherit?.tailFreeSampling ?? presets.basic.tailFreeSampling}
      />
      <RangeInput
        fieldName="typicalP"
        label="Typical P"
        helperText="Selects tokens according to the expected amount of information they contribute. Set this setting to 1 to disable its effect."
        min={0}
        max={1}
        step={0.01}
        value={props.inherit?.typicalP ?? presets.basic.typicalP}
      />
      <RangeInput
        fieldName="repetitionPenalty"
        label="Repetition Penalty"
        helperText="Used to penalize words that were already generated or belong to the context (Going over 1.2 breaks 6B models. Set to 1.0 to disable)."
        min={0}
        max={3}
        step={0.01}
        value={props.inherit?.repetitionPenalty ?? presets.basic.repetitionPenalty}
      />
      <RangeInput
        fieldName="repetitionPenaltyRange"
        label="Repetition Penalty Range"
        helperText="How many tokens will be considered repeated if they appear in the next output."
        min={0}
        max={2048}
        step={1}
        value={props.inherit?.repetitionPenaltyRange ?? presets.basic.repetitionPenaltyRange}
      />
      <RangeInput
        fieldName="repetitionPenaltySlope"
        label="Repetition Penalty Slope"
        helperText="Affects the ramping of the penalty's harshness, starting from the final token. (Set to 0.0 to disable)"
        min={0}
        max={10}
        step={0.01}
        value={props.inherit?.repetitionPenaltySlope ?? presets.basic.repetitionPenaltySlope}
      />
    </div>
  </>
)

export default GenerationSettings
