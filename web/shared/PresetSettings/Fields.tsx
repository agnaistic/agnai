import { Component, Show, createMemo } from 'solid-js'
import { PresetTabProps } from './types'
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
        onChange={(ev) => props.setter('presetMode', ev.value as any)}
      />
    </div>
  )
}

export const ResponseLength: Field<{
  subMax: Partial<SubscriptionModelLevel>
}> = (props) => {
  return (
    <RangeInput
      fieldName="maxTokens"
      label="Response Length"
      helperText="Maximum length of the response. Measured in 'tokens'"
      min={16}
      max={2048}
      step={1}
      value={props.state.maxTokens}
      disabled={props.state.disabled}
      onChange={(val) => props.setter('maxTokens', val)}
      recommended={props.subMax.maxTokens}
      recommendLabel="Max"
    />
  )
}

export const ContextSize: Field<{ subMax: Partial<SubscriptionModelLevel> }> = (props) => {
  const maxCtx = createMemo(() => {
    const ctx = props.subMax.maxContextLength
    if (!ctx) return

    const max = Math.floor(ctx / 1000)
    return `${max}K`
  })

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
              onChange={(ev) => props.setter('useMaxContext', ev)}
            >
              Use Max If Known:
            </ToggleButton>
          </div>
        }
        helperText={
          <>
            <p>
              The amount of infomation sent to the model to generate a response.{' '}
              <Show when={props.context.service !== 'agnaistic'}>
                Check your AI service for the maximum context size.
              </Show>
            </p>
          </>
        }
        min={16}
        max={props.context.service === 'claude' ? 200000 : 32000}
        step={1}
        value={props.state.maxContextLength || 8192}
        disabled={props.state.disabled}
        onChange={(ev) => props.setter('maxContextLength', ev)}
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
            props.setter('reasoning', {
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
            props.setter('reasoning', {
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
    <Card classList={{ hidden: props.hides.systemPrompt ?? false }}>
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
        onChange={(ev) => props.setter('systemPrompt', ev.prompt!)}
      />
    </Card>
  )
}

export const Jailbreak: Field = (props) => {
  return (
    <Card classList={{ hidden: props.hides.ultimeJailbreak ?? false }}>
      <FormLabel
        label="Jailbreak (UJB)"
        helperText={
          <>
            <p>
              <b>Uncensored Models</b>: Typically stylstic instructions. E.g. "Respond succinctly
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
        onChange={(ev) => props.setter('ultimeJailbreak', ev.prompt!)}
      />
    </Card>
  )
}

export const JinjaTemplate: Field = (props) => {
  const allowed: { [format in ThirdPartyFormat]?: boolean } = {
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
            onChange={(ev) => props.setter('jinjaEnabled', ev)}
          />
        </div>
      }
      helperMarkdown="For overriding third-party chat completion templates. Only sent when **Enabled**.
      If left blank, one will be generated for you."
      value={props.state.jinjaTemplate || ''}
      disabled={props.state.disabled}
      hide={!props.context.format || !allowed[props.context.format]}
      onChange={(ev) => props.setter('jinjaTemplate', ev.currentTarget.value)}
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
        onChange={(ev) => props.setter('modelFormat', ev.value as any)}
      />
    </>
  )
}

export const Temperature: Field = (props) => {
  return (
    <>
      <RangeInput
        fieldName="temp"
        label="Temperature"
        helperText="Creativity: Randomness of sampling. High values can increase creativity, but may make text less sensible. Lower values will make text more predictable."
        min={0.1}
        max={props.state.presetMode === 'simple' ? 1.5 : 10}
        step={0.01}
        value={props.state.temp}
        disabled={props.state.disabled}
        aiSetting={'temp'}
        recommended={props.sub?.preset.temp}
        onChange={(ev) => {
          props.setter('temp', ev)
        }}
      />
    </>
  )
}
