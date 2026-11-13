import { Component, Show, createMemo } from 'solid-js'
import TextInput from '../TextInput'
import { ToggleButton } from '../Button'
import RangeInput from '../RangeInput'
import Select from '../Select'
import { MODEL_FORMATS } from './General'
import { FormLabel } from '../FormLabel'
import { SubscriptionModelLevel } from '/common/types/presets'
import { Card } from '../Card'
import PromptEditor from '../PromptEditor'
import { ThirdPartyFormat } from '/common/adapters'
import { grokSpec } from '/srv/adapter/grok-preset'
import { PresetTabProps } from '/web/store/preset-context'

/**
 * Copy and slider limits that differ by third-party format.
 *
 * To add a format such as Gemini:
 * 1. Export any model lookup the slider needs from a browser-safe adapter module.
 * 2. Add one entry here, keyed by its ThirdPartyFormat value (`gemini`).
 * 3. Set only the fields that differ from the defaults in this file.
 *    Response length falls back to a 2048 max and the generic token sentence.
 *    Temperature falls back to a min of 0.1, then 1.5 in Simple mode and 10 in Advanced.
 *    Reasoning effort falls back to the generic list, selected value, and token-budget sentence.
 *    Context size falls back to 200000 for Claude and 32000 otherwise.
 * Which controls are shown is separate: register the provider in
 * web/shared/PresetSettings/known-provider-presets.ts.
 */
const FORMAT_FIELDS: Partial<
  Record<
    ThirdPartyFormat,
    {
      responseLength?: { helperText: string; max: number }
      temperature?: { helperText: string; min?: number; max: number }
      reasoning?: {
        helperText: string
        items: (state: PresetTabProps['state']) => { label: string; value: string }[]
        value: (state: PresetTabProps['state']) => string
      }
      contextSize?: {
        max: (state: PresetTabProps['state']) => number
        note: (state: PresetTabProps['state']) => string
      }
    }
  >
> = {
  grok: {
    responseLength: {
      helperText:
        'Visible reply length. Sent as max_completion_tokens, so reasoning tokens are not counted against it.',
      max: 16384,
    },
    temperature: {
      helperText: 'Grok accepts 0 to 2. Reasoning models work best at 1.',
      min: 0,
      max: 2,
    },
    reasoning: {
      helperText:
        'Grok 4.5 and later always reason. This sets depth. The API default is high. xhigh is only used by Grok 4.6 and 4.7.',
      items: (state) =>
        grokSpec(grokModel(state)).efforts.map((effort) => ({
          label: effort === 'xhigh' ? 'Max (xhigh)' : effort.charAt(0).toUpperCase() + effort.slice(1),
          value: effort,
        })),
      value: (state) => {
        const efforts = grokSpec(grokModel(state)).efforts as string[]
        const effort = state.reasoning?.effort
        return effort && efforts.includes(effort) ? effort : 'high'
      },
    },
    contextSize: {
      max: (state) => grokSpec(grokModel(state)).context,
      note: (state) => {
        const tokens = Math.round(grokSpec(grokModel(state)).context / 1000).toLocaleString()
        return `This Grok model accepts ${tokens}k tokens. Use Max keeps the preset on that limit.`
      },
    },
  },
}

/** Formats that can override the chat template. Add a format here to show the Jinja field. */
const JINJA_FORMATS: { [format in ThirdPartyFormat]?: boolean } = {
  'openai-chatv2': true,
  'openai-chat': true,
  koboldcpp: true,
  tabby: true,
  aphrodite: true,
  vllm: true,
  ollama: true,
  llamacpp: true,
  ooba: true,
  kobold: true,
  exllamav2: true,
}

const DEFAULT_RESPONSE_LENGTH =
  "Maximum length of the response. Measured in 'tokens'"
const DEFAULT_TEMPERATURE =
  'Creativity: Randomness of sampling. High values can increase creativity, but may make text less sensible. Lower values will make text more predictable.'

export function formatFields(format?: ThirdPartyFormat) {
  if (!format) return
  return FORMAT_FIELDS[format]
}

function grokModel(state: PresetTabProps['state']) {
  return state.providerModels?.[state.providerId || ''] || state.grokModel || state.thirdPartyModel
}

export type FieldProps = Omit<PresetTabProps, 'tab'>
export type Field<T = {}, TOnly extends keyof FieldProps = keyof FieldProps> = Component<
  Pick<FieldProps, TOnly> & T
>

export const PresetMode: Field = (props) => {
  return (
    <div>
      <Select
        fieldName="presetMode"
        label="Preset Mode"
        helperText={`Toggle between using "essential options" and all available controls.`}
        value={props.state.presetMode}
        items={[
          { label: 'Advanced', value: 'advanced' },
          { label: 'Simple', value: 'simple' },
        ]}
        onChange={(ev) => props.setters.setState('presetMode', ev.value as any)}
      />
    </div>
  )
}

export const ResponseLength: Field<{
  subMax: Partial<SubscriptionModelLevel>
}> = (props) => {
  const responseLength = () => formatFields(props.setters.context.format)?.responseLength
  return (
    <RangeInput
      fieldName="maxTokens"
      label="Response Length"
      helperText={responseLength()?.helperText ?? DEFAULT_RESPONSE_LENGTH}
      min={16}
      max={responseLength()?.max ?? 2048}
      step={1}
      value={props.state.maxTokens}
      disabled={props.state.disabled}
      onChange={(val) => props.setters.setState('maxTokens', val)}
      recommended={props.subMax.maxTokens}
      recommendLabel="Max"
    />
  )
}

export const ContextSize: Field<{ subMax: Partial<SubscriptionModelLevel> }> = (props) => {
  const maxCtx = createMemo(() => {
    const ctx = props.subMax.maxContextLength
    if (!ctx) return

    const max = Math.round(ctx / 1000)
    return `${max}K`
  })
  const contextSize = () => formatFields(props.setters.context.format)?.contextSize
  const contextNote = () => contextSize()?.note(props.state)
  const contextMax = () => {
    const sized = contextSize()
    if (sized) return sized.max(props.state)
    if (props.setters.context.service === 'claude') return 200000
    return 32000
  }

  return (
    <>
      <RangeInput
        fieldName="maxContextLength"
        label={
          <div class="flex gap-2">
            <div>
              Context Size{' '}
              <Show when={maxCtx()}>
                <span class="text-xs italic text-gray-500">(Max: {maxCtx()})</span>
              </Show>
            </div>

            <ToggleButton
              size="xs"
              fieldName="useMaxContext"
              onText="On"
              offText="Off"
              value={props.state.useMaxContext}
              onChange={(ev) => props.setters.setState('useMaxContext', ev)}
            >
              Use Max If Known:
            </ToggleButton>
          </div>
        }
        helperText={
          <>
            <p>
              The amount of infomation sent to the model to generate a response.{' '}
              <Show when={!!contextNote()}>{contextNote()}</Show>
              <Show when={!contextNote() && props.setters.context.service !== 'agnaistic'}>
                Check your AI service for the maximum context size.
              </Show>
            </p>
          </>
        }
        min={16}
        max={contextMax()}
        step={1}
        value={props.state.maxContextLength || 8192}
        disabled={props.state.disabled}
        onChange={(ev) => props.setters.setState('maxContextLength', ev)}
      />
    </>
  )
}

export const ReasoningTags: Field = (props) => {
  return (
    <div class="flex flex-col gap-1">
      <FormLabel
        label="Reasoning Tags"
        helperText="For collapsing reasoning sections in the UI: "
      />

      <div class="flex gap-2">
        <TextInput
          prelabel="Start"
          parentClass="w-1/2"
          fieldName="reasoning.start"
          placeholder="<think>"
          value={props.state.reasoning?.start || ''}
          onChange={(ev) =>
            props.setters.setState('reasoning', {
              ...props.state.reasoning,
              start: ev.currentTarget.value,
            })
          }
        />
        <TextInput
          prelabel="End"
          parentClass="w-1/2"
          fieldName="reasoning.end"
          placeholder="</think>"
          value={props.state.reasoning?.end || ''}
          onChange={(ev) =>
            props.setters.setState('reasoning', {
              ...props.state.reasoning,
              end: ev.currentTarget.value,
            })
          }
        />
      </div>
    </div>
  )
}

export const SystemPrompt: Field = (props) => {
  return (
    <Card classList={{ hidden: props.setters.context.hides.systemPrompt ?? false }}>
      <FormLabel
        label="System Prompt"
        helperText={<>The task the AI is performing. Leave blank if uncertain.</>}
      />
      <PromptEditor
        fieldName="systemPrompt"
        include={['char', 'user']}
        placeholder="Write {{char}}'s next reply in a fictional chat between {{char}} and {{user}}. Write 1 reply only in internet RP style, italicize actions, and avoid quotation marks. Use markdown. Be proactive, creative, and drive the plot and conversation forward. Write at least 1 paragraph, up to 4. Always stay in character and avoid repetition."
        value={props.state.systemPrompt ?? ''}
        disabled={props.state.disabled}
        onChange={(ev) => props.setters.setState('systemPrompt', ev.prompt!)}
      />
    </Card>
  )
}

export const Jailbreak: Field = (props) => {
  return (
    <Card classList={{ hidden: props.setters.context.hides.ultimeJailbreak ?? false }}>
      <FormLabel
        label="Jailbreak (UJB)"
        helperText={
          <>
            <p>
              <b>Uncensored Models</b>: Typically stylistic instructions. E.g. "Respond succinctly
              using slang"
            </p>
            <p>
              <b>Censored Models</b>: Instructions to 'jailbreak' from filtering.
            </p>
            <p>Large jailbreak prompts can cause repetition. Use this prompt only if needed.</p>
          </>
        }
      />

      <PromptEditor
        fieldName="ultimeJailbreak"
        include={['char', 'user']}
        placeholder="Respond succinctly using slang"
        value={props.state.ultimeJailbreak ?? ''}
        disabled={props.state.disabled}
        onChange={(ev) => props.setters.setState('ultimeJailbreak', ev.prompt!)}
      />
    </Card>
  )
}

export const JinjaTemplate: Field = (props) => {
  return (
    <TextInput
      fieldName="jinjaTemplate"
      label={
        <div class="flex w-full justify-between">
          <div>Jinja Template</div>
          <ToggleButton
            size="sm"
            onText="Enabled"
            offText="Disabled"
            value={props.state.jinjaEnabled ?? false}
            onChange={(ev) => props.setters.setState('jinjaEnabled', ev)}
          />
        </div>
      }
      helperMarkdown="For overriding third-party chat completion templates. Only sent when **Enabled**.
      If left blank, one will be generated for you."
      value={props.state.jinjaTemplate || ''}
      disabled={props.state.disabled}
      hide={!props.setters.context.format || !JINJA_FORMATS[props.setters.context.format]}
      onChange={(ev) => props.setters.setState('jinjaTemplate', ev.currentTarget.value)}
      isMultiline
    />
  )
}

export const ModelFormat: Field = (props) => {
  return (
    <>
      <Select
        fieldName="modelFormat"
        label="Prompt Format"
        helperMarkdown={`Formatting to use if using "Universal Tags" in your prompt template
      (I.e. \`<user>...</user>, <bot>...</bot>\`)`}
        items={MODEL_FORMATS}
        value={props.state.modelFormat || 'None'}
        onChange={(ev) => props.setters.setState('modelFormat', ev.value as any)}
      />
    </>
  )
}

export const Temperature: Field = (props) => {
  const temperature = () => formatFields(props.setters.context.format)?.temperature
  return (
    <>
      <RangeInput
        fieldName="temp"
        label="Temperature"
        helperText={temperature()?.helperText ?? DEFAULT_TEMPERATURE}
        min={temperature()?.min ?? 0.1}
        max={temperature()?.max ?? (props.state.presetMode === 'simple' ? 1.5 : 10)}
        step={0.01}
        value={props.state.temp}
        disabled={props.state.disabled}
        aiSetting={'temp'}
        recommended={props.sub?.preset.temp}
        onChange={(ev) => {
          props.setters.setState('temp', ev)
        }}
      />
    </>
  )
}
