import { Component, Show, createMemo, createSignal, onMount } from 'solid-js'
import { FLAI_CONTEXTS, GOOGLE_MODELS } from '/common/adapters'
import { PresetTabProps } from './types'
import TextInput from '../TextInput'
import Button, { ToggleButton } from '../Button'
import { getStore } from '/web/store/create'
import RangeInput from '../RangeInput'
import { settingStore } from '/web/store'
import Select from '../Select'
import { MODEL_FORMATS } from './General'
import { FormLabel } from '../FormLabel'
import { SubscriptionModelLevel } from '/common/types/presets'
import { Card } from '../Card'
import PromptEditor from '../PromptEditor'
import { CustomSelect } from '../CustomSelect'
import { FeatherlessModel } from '/srv/adapter/featherless'
import { ArliModel } from '/srv/adapter/arli'

export type Field<T = {}> = Component<Omit<PresetTabProps, 'tab'> & T>

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
      max={1024}
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
              <Show when={props.state.service !== 'agnaistic'}>
                Check your AI service for the maximum context size.
              </Show>
            </p>
          </>
        }
        min={16}
        max={props.state.service === 'claude' ? 200000 : 32000}
        step={1}
        value={props.state.maxContextLength || 4096}
        disabled={props.state.disabled}
        onChange={(ev) => props.setter('maxContextLength', ev)}
      />
    </>
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

export const ThirdPartyUrl: Field = (props) => {
  return (
    <TextInput
      fieldName="thirdPartyUrl"
      label="Third Party URL"
      helperText="API URL for third-party or self-hosted service"
      placeholder="E.g. https://some-tunnel-url.loca.lt"
      value={props.state.thirdPartyUrl || ''}
      disabled={props.state.disabled}
      hide={
        props.hides.thirdPartyUrl ||
        props.state.thirdPartyFormat === 'featherless' ||
        props.state.thirdPartyFormat === 'mistral' ||
        props.state.thirdPartyFormat === 'gemini' ||
        props.state.thirdPartyFormat === 'arli'
      }
      onChange={(ev) => props.setter('thirdPartyUrl', ev.currentTarget.value)}
    />
  )
}

export const ThirdPartyKey: Field = (props) => {
  return (
    <>
      <TextInput
        fieldName="thirdPartyKey"
        label={
          <div class="mt-1 flex gap-4">
            <div>Third Party API Key</div>
            <Show when={props.state._id}>
              <Button
                size="pill"
                onClick={() => getStore('presets').deleteUserPresetKey(props.state._id!)}
              >
                Remove Key
              </Button>
            </Show>
          </div>
        }
        helperText="Never enter your official OpenAI, Claude, Mistral keys here."
        value={props.state.thirdPartyKey}
        disabled={props.state.disabled}
        type="password"
        hide={props.hides.thirdPartyKey}
        onChange={(ev) => props.setter('thirdPartyKey', ev.currentTarget.value)}
      />
    </>
  )
}

export const ModelFormat: Field = (props) => {
  return (
    <>
      <Select
        fieldName="modelFormat"
        label="Prompt Format"
        helperMarkdown={`Which formatting method to use if using "universal tags" in your prompt template
      (I.e. \`<user>...</user>, <bot>...</bot>\`)`}
        items={MODEL_FORMATS}
        value={props.state.modelFormat || 'Alpaca'}
        recommend={props.sub?.preset.modelFormat}
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
        onChange={(ev) => props.setter('temp', ev)}
      />
    </>
  )
}

export const FeatherlessModels: Field = (props) => {
  const state = settingStore((s) => s.featherless)
  const [modelclass, setModelclass] = createSignal('')

  const label = createMemo(() => {
    const id = props.state.featherlessModel
    const match = state.models.find((s) => s.id === id)
    if (!match) return id || 'None selected'

    return (
      <span title={`${match.status}, ${(match.health || '...').toLowerCase()}`}>
        {match.id}
        <span class="text-500 text-xs">
          {' '}
          {flaiContext(match, state.classes)} {match.status}
        </span>
      </span>
    )
  })

  const options = createMemo(() => {
    return state.models
      .filter((s) => {
        const mclass = modelclass()
        if (!mclass) return true
        return s.model_class === mclass
      })
      .map((s) => ({
        label: (
          <div
            class="flex w-full justify-between"
            title={`${s.status}, ${(s.health || '...').toLowerCase()}`}
          >
            <div class="ellipsis">{s.id}</div>
            <div class="text-500 text-xs">
              {flaiContext(s, state.classes)} {s.status}
            </div>
          </div>
        ),
        value: s.id,
      }))
  })

  onMount(() => {
    if (!state.models.length) {
      settingStore.getFeatherless()
    }
  })

  const search = (value: string, input: string) => {
    const res = input.split(' ').map((text) => new RegExp(text.replace(/\*/gi, '[a-z0-9]'), 'gi'))

    for (const re of res) {
      const match = value.match(re)
      if (!match) return false
    }

    return true
  }

  const classes = createMemo(() => {
    const list = Object.entries(state.classes)
      .map(([label, { ctx }]) => ({ label: `${label} - ${Math.round(ctx / 1024)}k`, value: label }))
      .sort((l, r) => l.label.localeCompare(r.label))
    return [{ label: 'All', value: '' }].concat(list)
  })

  return (
    <CustomSelect
      modalTitle="Select a Model"
      label="Featherless Model"
      value={props.state.featherlessModel}
      options={options()}
      search={search}
      header={
        <Select
          items={classes()}
          value={''}
          label={'Filter: Model Class'}
          fieldName="featherless.classFilter"
          onChange={(ev) => setModelclass(ev.value)}
          parentClass="text-sm"
        />
      }
      onSelect={(opt) => {
        props.setter('featherlessModel', opt.value)
      }}
      buttonLabel={label()}
      selected={props.state.featherlessModel}
      hide={props.state.service !== 'kobold' || props.state.thirdPartyFormat !== 'featherless'}
    />
  )
}

export const ArliModels: Field = (props) => {
  const state = settingStore((s) => s.arliai)
  const [modelclass, setModelclass] = createSignal('')

  const label = createMemo(() => {
    const id = props.state.arliModel
    const match = state.models.find((s) => s.id === id)
    if (!match) return id || 'None selected'

    return (
      <span title={`${match.status}, ${(match.health || '...').toLowerCase()}`}>
        {match.id}
        <span class="text-500 text-xs">
          {' '}
          {flaiContext(match, state.classes)} {match.status}
        </span>
      </span>
    )
  })

  const options = createMemo(() => {
    return state.models
      .filter((s) => {
        const mclass = modelclass()
        if (!mclass) return true
        return s.model_class === mclass
      })
      .map((s) => ({
        label: (
          <div class="flex w-full justify-between" title={`${s.status}`}>
            <div class="ellipsis">{s.id}</div>
            <div class="text-500 text-xs">
              {arliContext(s, state.classes)} {s.status}
            </div>
          </div>
        ),
        value: s.id,
      }))
  })

  onMount(() => {
    if (!state.models.length) {
      settingStore.getArliAI()
    }
  })

  const search = (value: string, input: string) => {
    const res = input.split(' ').map((text) => new RegExp(text.replace(/\*/gi, '[a-z0-9]'), 'gi'))

    for (const re of res) {
      const match = value.match(re)
      if (!match) return false
    }

    return true
  }

  const classes = createMemo(() => {
    const list = Object.entries(state.classes)
      .map(([label, { ctx }]) => ({ label: `${label} - ${Math.round(ctx / 1024)}k`, value: label }))
      .sort((l, r) => l.label.localeCompare(r.label))
    return [{ label: 'All', value: '' }].concat(list)
  })

  return (
    <CustomSelect
      modalTitle="Select a Model"
      label="ArliAI Model"
      value={props.state.arliModel}
      options={options()}
      search={search}
      header={
        <Select
          items={classes()}
          value={''}
          label={'Filter: Model Size'}
          onChange={(ev) => setModelclass(ev.value)}
          parentClass="text-sm"
        />
      }
      onSelect={(opt) => {
        props.setter('arliModel', opt.value)
      }}
      buttonLabel={label()}
      selected={props.state.arliModel}
      hide={props.state.service !== 'kobold' || props.state.thirdPartyFormat !== 'arli'}
    />
  )
}

export const GoogleModels: Field = (props) => {
  const label = createMemo(() => {
    const id = props.state.googleModel
    if (!id) return 'None Selected'
    const match = Object.values(GOOGLE_MODELS).find((model) => model.id === id)
    if (!match) return 'Invalid Model'
    return match.label
  })

  const options = createMemo(() => {
    const list = Object.values(GOOGLE_MODELS).map(({ label, id }) => ({ label, value: id }))
    return list
  })

  return (
    <CustomSelect
      modalTitle="Select a Model"
      label="Google Model"
      value={props.state.googleModel || GOOGLE_MODELS.GEMINI_15_PRO.id}
      options={options()}
      search={(value, search) => value.toLowerCase().includes(search.toLowerCase())}
      onSelect={(opt) => props.setter('googleModel', opt.value)}
      buttonLabel={label()}
      selected={props.state.googleModel}
      hide={props.state.service !== 'kobold' || props.state.thirdPartyFormat !== 'gemini'}
    />
  )
}

function flaiContext(
  model: FeatherlessModel,
  classes: Record<string, { ctx: number; res: number }>
) {
  const ctx = model.ctx || classes[model.model_class]?.ctx || FLAI_CONTEXTS[model.model_class]
  if (!ctx) return ''

  return `${Math.round(ctx / 1024)}K`
}

function arliContext(model: ArliModel, classes: Record<string, { ctx: number; res: number }>) {
  const ctx = model.ctx || classes[model.model_class]?.ctx || FLAI_CONTEXTS[model.model_class]
  if (!ctx) return ''

  return `${Math.round(ctx / 1024)}K`
}
