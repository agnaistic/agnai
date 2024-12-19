import { Component } from 'solid-js'
import RangeInput from '../RangeInput'
import { defaultPresets } from '../../../common/presets'
import { Card } from '../Card'
import { A } from '@solidjs/router'
import { PresetTabProps } from './types'
import { HelpModal } from '../Modal'
import { ListInput } from '../ListInput'

export const SliderSettings: Component<PresetTabProps> = (props) => {
  return (
    <div class="flex flex-col gap-4" classList={{ hidden: props.tab !== 'Samplers' }}>
      <Card class="flex flex-col gap-1" bg="bg-500">
        <div>Dynamic Temperature</div>
        <div class="text-600 text-sm">
          The range to use for dynamic temperature. When used, the actual temperature is allowed to
          be automatically adjusted dynamically between DynaTemp ± DynaTempRange. For example,
          setting `temperature=0.4` and `dynatemp_range=0.1` will result in a minimum temp of 0.3
          and max of 0.5.
        </div>

        <RangeInput
          fieldName="dynatemp_range"
          label="Range"
          min={0}
          max={20}
          step={0.01}
          value={props.state.dynatemp_range ?? 0}
          disabled={props.state.disabled}
          aiSetting={'dynatemp_range'}
          onChange={(ev) => props.setter('dynatemp_range', ev)}
          hide={props.hides.dynatemp_range}
        />

        <RangeInput
          fieldName="dynatemp_exponent"
          label="Exponent"
          min={0}
          max={20}
          step={0.01}
          value={props.state.dynatemp_exponent ?? 1}
          disabled={props.state.disabled}
          recommended={1}
          aiSetting={'dynatemp_exponent'}
          onChange={(ev) => props.setter('dynatemp_exponent', ev)}
          hide={props.hides.dynatemp_exponent}
        />
      </Card>

      <Card class="flex flex-col gap-1" bg="bg-500" hide={props.hides.xtcThreshold}>
        <div class="flex gap-1">
          XTC (Exclude Top Choices) <XTCHelpModal />
        </div>

        <RangeInput
          label="Threshold"
          min={0}
          max={1}
          step={0.01}
          value={props.state.xtcThreshold ?? 0}
          disabled={props.state.disabled}
          aiSetting={'xtcThreshold'}
          recommended={0.1}
          onChange={(ev) => props.setter('xtcThreshold', ev)}
          hide={props.hides.xtcThreshold}
        />

        <RangeInput
          label="Probability"
          min={0}
          max={1}
          step={0.01}
          value={props.state.xtcProbability ?? 0}
          disabled={props.state.disabled}
          aiSetting={'xtcProbability'}
          recommended={0.5}
          onChange={(ev) => props.setter('xtcProbability', ev)}
          hide={props.hides.xtcThreshold}
        />
      </Card>

      <Card class="flex flex-col gap-1" bg="bg-500" hide={props.hides.dryMultiplier}>
        <div>
          DRY Sampling{' '}
          <a
            class="link"
            href="https://github.com/oobabooga/text-generation-webui/pull/5677"
            target="_blank"
          >
            Reference
          </a>
        </div>

        <RangeInput
          label={'Multiplier'}
          min={0}
          max={1}
          step={0.01}
          value={props.state.dryMultiplier ?? 0}
          disabled={props.state.disabled}
          aiSetting={'dryMultiplier'}
          recommended={0.8}
          onChange={(ev) => props.setter('dryMultiplier', ev)}
          hide={props.hides.dryMultiplier}
        />

        <RangeInput
          label="Base"
          min={0}
          max={6}
          step={0.01}
          value={props.state.dryBase ?? 0}
          disabled={props.state.disabled}
          aiSetting={'dryBase'}
          recommended={1.75}
          onChange={(ev) => props.setter('dryBase', ev)}
          hide={props.hides.dryBase}
        />

        <RangeInput
          label="Allowed Length"
          min={0}
          max={10}
          step={1}
          value={props.state.dryAllowedLength ?? 0}
          disabled={props.state.disabled}
          aiSetting={'dryAllowedLength'}
          recommended={2}
          onChange={(ev) => props.setter('dryAllowedLength', ev)}
        />

        <ListInput
          value={props.state.drySequenceBreakers || []}
          label="Sequence Breakers"
          helperText="Words and phrases that can be repeated. E.g: Chararacter nicknames"
          setter={(next) => props.setter('drySequenceBreakers', next)}
          hide={props.hides.drySequenceBreakers}
        />
      </Card>

      <Card class="flex flex-col gap-4" bg="bg-500">
        <RangeInput
          fieldName="smoothingFactor"
          label="Smoothing Factor"
          helperText="Activates Quadratic Sampling. Applies an S-curve to logits, penalizing low-probability tokens and smoothing out high-probability tokens. Allows model creativity at lower temperatures. (Put this value on 0 to disable its effect)"
          min={0}
          max={10}
          step={0.01}
          value={props.state.smoothingFactor ?? 0}
          disabled={props.state.disabled}
          aiSetting={'smoothingFactor'}
          recommended={props.sub?.preset.smoothingFactor}
          onChange={(ev) => props.setter('smoothingFactor', ev)}
          hide={props.hides.smoothingFactor}
        />
        <RangeInput
          fieldName="smoothingCurve"
          label="Smoothing Curve"
          helperText="The smoothing curve to use for Cubic Sampling. (Put this value on 1 to disable its effect)"
          min={1}
          max={5}
          step={0.01}
          value={props.state.smoothingCurve ?? 1}
          disabled={props.state.disabled}
          aiSetting={'smoothingCurve'}
          recommended={props.sub?.preset.smoothingCurve}
          onChange={(ev) => props.setter('smoothingCurve', ev)}
          hide={props.hides.smoothingCurve}
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
          value={props.state.cfgScale ?? 1}
          disabled={props.state.disabled}
          aiSetting={'cfgScale'}
          onChange={(ev) => props.setter('cfgScale', ev)}
          hide={props.hides.cfgScale}
        />

        <RangeInput
          fieldName="topP"
          label="Top P"
          helperText="Used to discard unlikely text in the sampling process. Lower values will make text more predictable but can become repetitious. (Put this value on 1 to disable its effect)"
          min={0}
          max={1}
          step={0.01}
          value={props.state.topP ?? defaultPresets.basic.topP}
          disabled={props.state.disabled}
          aiSetting={'topP'}
          recommended={props.sub?.preset.topP}
          onChange={(ev) => props.setter('topP', ev)}
          hide={props.hides.topP}
        />

        <RangeInput
          fieldName="topK"
          label="Top K"
          helperText="Alternative sampling method, can be combined with top_p. The number of highest probability vocabulary tokens to keep for top-k-filtering. (Put this value on 0 to disable its effect)"
          min={0}
          max={100}
          step={1}
          value={props.state.topK ?? defaultPresets.basic.topK}
          disabled={props.state.disabled}
          aiSetting={'topK'}
          recommended={props.sub?.preset.topK}
          onChange={(ev) => props.setter('topK', ev)}
          hide={props.hides.topK}
        />
        <RangeInput
          fieldName="topA"
          label="Top A"
          helperText="Increases the consistency of the output by removing unlikely tokens based on the highest token probability. Exclude all tokens with p < (top_a * highest_p^2) (Put this value on 0 to disable its effect)"
          min={0}
          max={1}
          step={0.01}
          value={props.state.topA ?? 0}
          disabled={props.state.disabled}
          aiSetting={'topA'}
          recommended={props.sub?.preset.topA}
          onChange={(ev) => props.setter('topA', ev)}
          hide={props.hides.topA}
        />

        <RangeInput
          fieldName="mirostatTau"
          label="Mirostat Tau"
          helperText="*Enable Mirotstat in the Toggles section* Mirostat aims to keep the text at a fixed complexity set by tau."
          min={0}
          max={6}
          step={0.01}
          value={props.state.mirostatTau ?? 0}
          disabled={props.state.disabled}
          aiSetting={'mirostatTau'}
          onChange={(ev) => props.setter('mirostatTau', ev)}
          hide={props.hides.mirostatTau}
        />
        <RangeInput
          fieldName="mirostatLR"
          label="Mirostat Learning Rate (ETA)"
          helperText="Mirostat aims to keep the text at a fixed complexity set by tau."
          min={0}
          max={1}
          step={0.01}
          value={props.state.mirostatLR ?? 1}
          disabled={props.state.disabled}
          aiSetting={'mirostatLR'}
          onChange={(ev) => props.setter('mirostatLR', ev)}
          hide={props.hides.mirostatTau}
        />
        <RangeInput
          fieldName="tailFreeSampling"
          label="Tail Free Sampling"
          helperText="Increases the consistency of the output by working from the bottom and trimming the lowest probability tokens. (Put this value on 1 to disable its effect)"
          min={0}
          max={1}
          step={0.001}
          value={props.state.tailFreeSampling ?? defaultPresets.basic.tailFreeSampling}
          disabled={props.state.disabled}
          aiSetting={'tailFreeSampling'}
          recommended={props.sub?.preset.tailFreeSampling}
          onChange={(ev) => props.setter('tailFreeSampling', ev)}
          hide={props.hides.tailFreeSampling}
        />
        <RangeInput
          fieldName="typicalP"
          label="Typical P"
          helperText="Selects tokens according to the expected amount of information they contribute. Set this setting to 1 to disable its effect."
          min={0}
          max={1}
          step={0.01}
          value={props.state.typicalP ?? defaultPresets.basic.typicalP}
          disabled={props.state.disabled}
          aiSetting={'typicalP'}
          recommended={props.sub?.preset.typicalP}
          onChange={(ev) => props.setter('typicalP', ev)}
          hide={props.hides.typicalP}
        />
        <RangeInput
          fieldName="repetitionPenalty"
          label="Repetition Penalty"
          helperText="Used to penalize words that were already generated or belong to the context (Going over 1.2 breaks 6B models. Set to 1.0 to disable)."
          min={0}
          max={3}
          step={0.01}
          value={props.state.repetitionPenalty ?? defaultPresets.basic.repetitionPenalty}
          disabled={props.state.disabled}
          aiSetting={'repetitionPenalty'}
          recommended={props.sub?.preset.repetitionPenalty}
          onChange={(ev) => props.setter('repetitionPenalty', ev)}
          hide={props.hides.repetitionPenalty}
        />
        <RangeInput
          fieldName="repetitionPenaltyRange"
          label="Repetition Penalty Range"
          helperText="How many tokens will be considered repeated if they appear in the next output."
          min={0}
          max={2048}
          step={1}
          value={props.state.repetitionPenaltyRange ?? defaultPresets.basic.repetitionPenaltyRange}
          disabled={props.state.disabled}
          aiSetting={'repetitionPenaltyRange'}
          recommended={props.sub?.preset.repetitionPenaltyRange}
          onChange={(ev) => props.setter('repetitionPenaltyRange', ev)}
          hide={props.hides.repetitionPenaltyRange}
        />
        <RangeInput
          fieldName="repetitionPenaltySlope"
          label="Repetition Penalty Slope"
          helperText="Affects the ramping of the penalty's harshness, starting from the final token. (Set to 0.0 to disable)"
          min={0}
          max={10}
          step={0.01}
          value={props.state.repetitionPenaltySlope ?? defaultPresets.basic.repetitionPenaltySlope}
          disabled={props.state.disabled}
          aiSetting={'repetitionPenaltySlope'}
          recommended={props.sub?.preset.repetitionPenaltySlope}
          onChange={(ev) => props.setter('repetitionPenaltySlope', ev)}
          hide={props.hides.repetitionPenaltySlope}
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
          value={props.state.etaCutoff ?? 0}
          disabled={props.state.disabled}
          aiSetting={'etaCutoff'}
          onChange={(ev) => props.setter('etaCutoff', ev)}
          hide={props.hides.etaCutoff}
        />
        <RangeInput
          fieldName="epsilonCutoff"
          label="Epsilon Cutoff"
          helperText="In units of 1e-4; a reasonable value is 3. This sets a probability floor below which tokens are excluded from being sampled."
          min={0}
          max={9}
          step={0.0001}
          value={props.state.epsilonCutoff ?? 0}
          disabled={props.state.disabled}
          aiSetting={'epsilonCutoff'}
          onChange={(ev) => props.setter('epsilonCutoff', ev)}
          hide={props.hides.epsilonCutoff}
        />
        <RangeInput
          fieldName="frequencyPenalty"
          label="Frequency Penalty"
          helperText="Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim. (Set to 0.0 to disable)"
          min={-2.0}
          max={2.0}
          step={0.01}
          value={props.state.frequencyPenalty ?? defaultPresets.openai.frequencyPenalty}
          disabled={props.state.disabled}
          aiSetting={'frequencyPenalty'}
          recommended={props.sub?.preset.frequencyPenalty}
          onChange={(ev) => props.setter('frequencyPenalty', ev)}
          hide={props.hides.frequencyPenalty}
        />
        <RangeInput
          fieldName="presencePenalty"
          label="Presence Penalty"
          helperText="Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics. (Set to 0.0 to disable)"
          min={-2.0}
          max={2.0}
          step={0.01}
          value={props.state.presencePenalty ?? defaultPresets.openai.presencePenalty}
          disabled={props.state.disabled}
          aiSetting={'presencePenalty'}
          recommended={props.sub?.preset.presencePenalty}
          onChange={(ev) => props.setter('presencePenalty', ev)}
          hide={props.hides.presencePenalty}
        />
        <RangeInput
          fieldName="encoderRepitionPenalty"
          label="Encoder Repetion Penalty"
          helperText="Also known as the 'Hallucinations filter'. Used to penalize tokens that are *not* in the prior text. Higher value = more likely to stay in context, lower value = more likely to diverge"
          min={0.8}
          max={1.5}
          step={0.01}
          value={props.state.encoderRepitionPenalty ?? defaultPresets.basic.encoderRepitionPenalty}
          disabled={props.state.disabled}
          aiSetting={'encoderRepitionPenalty'}
          recommended={props.sub?.preset.encoderRepitionPenalty}
          onChange={(ev) => props.setter('encoderRepitionPenalty', ev)}
          hide={props.hides.encoderRepitionPenalty}
        />

        <RangeInput
          fieldName="penaltyAlpha"
          label="Penalty Alpha"
          helperText="The values balance the model confidence and the degeneration penalty in contrastive search decoding"
          min={0}
          max={5}
          step={0.01}
          value={props.state.penaltyAlpha ?? defaultPresets.basic.penaltyAlpha}
          disabled={props.state.disabled}
          aiSetting={'penaltyAlpha'}
          recommended={props.sub?.preset.penaltyAlpha}
          onChange={(ev) => props.setter('penaltyAlpha', ev)}
          hide={props.hides.penaltyAlpha}
        />

        <RangeInput
          fieldName="numBeams"
          label="Number of Beams"
          helperText="Number of beams for beam search. 1 means no beam search."
          min={1}
          max={20}
          step={1}
          value={props.state.numBeams ?? 1}
          disabled={props.state.disabled}
          aiSetting={'numBeams'}
          onChange={(ev) => props.setter('numBeams', ev)}
          hide={props.hides.numBeams}
        />
      </Card>
    </div>
  )
}

const XTCHelpModal = () => (
  <HelpModal cta={<a class="link">Reference</a>} title="Exclude Top Choices">
    <p>
      XTC is a novel sampler that turns truncation on its head: Instead of pruning the least likely
      tokens, under certain circumstances, it removes the most likely tokens from consideration.
    </p>
    <p>
      More precisely, it removes all except the least likely token meeting a given threshold, with a
      given probability
    </p>
    <p>
      <a
        href="https://github.com/oobabooga/text-generation-webui/pull/6335"
        target="_blank"
        class="link"
      >
        Reference
      </a>
    </p>
  </HelpModal>
)
