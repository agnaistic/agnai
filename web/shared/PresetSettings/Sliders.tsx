import { Component } from 'solid-js'
import RangeInput from '../RangeInput'
import { AppSchema } from '../../../common/types/schema'
import { defaultPresets } from '../../../common/presets'
import { ThirdPartyFormat } from '../../../common/adapters'
import { Card } from '../Card'
import { A } from '@solidjs/router'
import { PresetProps } from './types'

export const SliderSettings: Component<
  PresetProps & {
    pane: boolean
    format?: ThirdPartyFormat
    tab: string
    sub?: AppSchema.SubscriptionModelOption
  }
> = (props) => {
  return (
    <div class="flex flex-col gap-4" classList={{ hidden: props.tab !== 'Samplers' }}>
      <Card class="flex flex-col gap-4">
        <RangeInput
          fieldName="dynatemp_range"
          label="Dynamic Temperature Range"
          helperText="The range to use for dynamic temperature. When used, the actual temperature is allowed to be automatically adjusted dynamically between DynaTemp ± DynaTempRange. For example, setting `temperature=0.4` and `dynatemp_range=0.1` will result in a minimum temp of 0.3 and max of 0.5. (Put this value on 0 to disable its effect)"
          min={0}
          max={20}
          step={0.01}
          value={props.inherit?.dynatemp_range || 0}
          disabled={props.disabled}
          aiSetting={'dynatemp_range'}
          recommended={props.sub?.preset.dynatemp_range}
        />

        <RangeInput
          fieldName="dynatemp_exponent"
          label="Dynamic Temperature Exponent"
          helperText="Exponent for dynatemp sampling. Range [0, inf)."
          min={0}
          max={20}
          step={0.01}
          value={props.inherit?.dynatemp_exponent || 1}
          disabled={props.disabled}
          aiSetting={'dynatemp_exponent'}
          recommended={props.sub?.preset.dynatemp_exponent}
        />
        <RangeInput
          fieldName="smoothingFactor"
          label="Smoothing Factor"
          helperText="Activates Quadratic Sampling. Applies an S-curve to logits, penalizing low-probability tokens and smoothing out high-probability tokens. Allows model creativity at lower temperatures. (Put this value on 0 to disable its effect)"
          min={0}
          max={10}
          step={0.01}
          value={props.inherit?.smoothingFactor || 0}
          disabled={props.disabled}
          aiSetting={'smoothingFactor'}
          recommended={props.sub?.preset.dynatemp_exponent}
        />
        <RangeInput
          fieldName="smoothingCurve"
          label="Smoothing Curve"
          helperText="The smoothing curve to use for Cubic Sampling. (Put this value on 1 to disable its effect)"
          min={1}
          max={5}
          step={0.01}
          value={props.inherit?.smoothingCurve || 1}
          disabled={props.disabled}
          aiSetting={'smoothingCurve'}
          recommended={props.sub?.preset.smoothingCurve}
        />
        <RangeInput
          fieldName="cfgScale"
          label="CFG Scale"
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
          aiSetting={'cfgScale'}
        />

        <RangeInput
          fieldName="minP"
          label="Min P"
          helperText="Used to discard tokens with the probability under a threshold (min_p) in the sampling process. Higher values will make text more predictable. (Put this value on 0 to disable its effect)"
          min={0}
          max={1}
          step={0.01}
          value={props.inherit?.minP ?? 0}
          disabled={props.disabled}
          aiSetting={'minP'}
          recommended={props.sub?.preset.minP}
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
          aiSetting={'topP'}
          recommended={props.sub?.preset.topP}
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
          aiSetting={'topK'}
          recommended={props.sub?.preset.topK}
        />
        <RangeInput
          fieldName="topA"
          label="Top A"
          helperText="Increases the consistency of the output by removing unlikely tokens based on the highest token probability. Exclude all tokens with p < (top_a * highest_p^2) (Put this value on 0 to disable its effect)"
          min={0}
          max={1}
          step={0.01}
          value={props.inherit?.topA ?? 0}
          disabled={props.disabled}
          aiSetting={'topA'}
          recommended={props.sub?.preset.topA}
        />

        <RangeInput
          fieldName="mirostatTau"
          label="Mirostat Tau"
          helperText="*Enable Mirotstat in the Toggles section* Mirostat aims to keep the text at a fixed complexity set by tau."
          min={0}
          max={6}
          step={0.01}
          value={props.inherit?.mirostatTau ?? 0}
          disabled={props.disabled}
          aiSetting={'mirostatTau'}
        />
        <RangeInput
          fieldName="mirostatLR"
          label="Mirostat Learning Rate (ETA)"
          helperText="Mirostat aims to keep the text at a fixed complexity set by tau."
          min={0}
          max={1}
          step={0.01}
          value={props.inherit?.mirostatLR ?? 1}
          disabled={props.disabled}
          aiSetting={'mirostatLR'}
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
          aiSetting={'tailFreeSampling'}
          recommended={props.sub?.preset.tailFreeSampling}
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
          aiSetting={'typicalP'}
          recommended={props.sub?.preset.typicalP}
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
          aiSetting={'repetitionPenalty'}
          recommended={props.sub?.preset.repetitionPenalty}
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
          aiSetting={'repetitionPenaltyRange'}
          recommended={props.sub?.preset.repetitionPenaltyRange}
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
          aiSetting={'repetitionPenaltySlope'}
          recommended={props.sub?.preset.repetitionPenaltySlope}
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
          aiSetting={'etaCutoff'}
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
          aiSetting={'epsilonCutoff'}
        />
        <RangeInput
          fieldName="frequencyPenalty"
          label="Frequency Penalty"
          helperText="Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim. (Set to 0.0 to disable)"
          min={-2.0}
          max={2.0}
          step={0.01}
          value={props.inherit?.frequencyPenalty ?? defaultPresets.openai.frequencyPenalty}
          disabled={props.disabled}
          aiSetting={'frequencyPenalty'}
          recommended={props.sub?.preset.frequencyPenalty}
        />
        <RangeInput
          fieldName="presencePenalty"
          label="Presence Penalty"
          helperText="Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics. (Set to 0.0 to disable)"
          min={-2.0}
          max={2.0}
          step={0.01}
          value={props.inherit?.presencePenalty ?? defaultPresets.openai.presencePenalty}
          disabled={props.disabled}
          aiSetting={'presencePenalty'}
          recommended={props.sub?.preset.presencePenalty}
        />
        <RangeInput
          fieldName="encoderRepitionPenalty"
          label="Encoder Repetion Penalty"
          helperText="Also known as the 'Hallucinations filter'. Used to penalize tokens that are *not* in the prior text. Higher value = more likely to stay in context, lower value = more likely to diverge"
          min={0.8}
          max={1.5}
          step={0.01}
          value={
            props.inherit?.encoderRepitionPenalty ?? defaultPresets.basic.encoderRepitionPenalty
          }
          disabled={props.disabled}
          aiSetting={'encoderRepitionPenalty'}
          recommended={props.sub?.preset.encoderRepitionPenalty}
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
          aiSetting={'penaltyAlpha'}
          recommended={props.sub?.preset.penaltyAlpha}
        />

        <RangeInput
          fieldName="numBeams"
          label="Number of Beams"
          helperText="Number of beams for beam search. 1 means no beam search."
          min={1}
          max={20}
          step={1}
          value={props.inherit?.numBeams ?? 1}
          disabled={props.disabled}
          aiSetting={'numBeams'}
        />
      </Card>
    </div>
  )
}
