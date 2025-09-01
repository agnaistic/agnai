import { Component, createMemo } from 'solid-js'
import TextInput from '../TextInput'
import Select from '../Select'
import { samplerOrders, settingLabels } from '../../../common/adapters'
import { Toggle } from '../Toggle'
import { Card } from '../Card'
import Sortable, { SortItem } from '../Sortable'
import { A } from '@solidjs/router'
import { inverseSamplerServiceMap, samplerServiceMap } from '/common/sampler-order'
import { PresetFuncs, PresetState, PresetTabProps } from '/web/store/preset-context'

export const ToggleSettings: Component<PresetTabProps> = (props) => {
  return (
    <div class="flex flex-col gap-4" classList={{ hidden: props.tab !== 'Toggles' }}>
      <Card class="flex flex-col gap-4" bg="bg-500">
        <Toggle
          label="Skip Chat Role Merges"
          helperText="Chat completions: When enabled, do not collapse repeated roles into a single message"
          value={props.state.skipRoleMerging}
          onChange={(ev) => props.setters.setState('skipRoleMerging', ev)}
        />

        <Toggle
          label="Ensure Last Role is User"
          helperMarkdown={`Chat completions: When enabled, the \`{{post}}\` amble will be sent as a USER role, instead of ASSISTANT.
          Fixes DeepSeek 3.1 issues.`}
          value={props.state.postUserRole}
          onChange={(ev) => props.setters.setState('postUserRole', ev)}
        />

        <TextInput
          fieldName="cfgOppose"
          label="CFG Opposing Prompt"
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
          value={props.state.cfgOppose || ''}
          disabled={props.state.disabled}
          hide={props.setters.hides.cfgScale}
          onChange={(ev) => props.setters.setState('cfgOppose', ev.currentTarget.value)}
        />

        <Select
          fieldName="phraseRepPenalty"
          label={'Phrase Repetition Penalty'}
          helperText={
            'Penalizes token sequences, reducing the chance of generations repeating earlier text.'
          }
          items={[
            { label: 'Very Aggressive', value: 'very_aggressive' },
            { label: 'Aggressive', value: 'aggressive' },
            { label: 'Medium', value: 'medium' },
            { label: 'Light', value: 'light' },
            { label: 'Very Light', value: 'very_light' },
            { label: 'Off', value: 'off' },
          ]}
          value={props.state.phraseRepPenalty || 'aggressive'}
          hide={props.setters.hides.phraseRepPenalty}
          onChange={(ev) => props.setters.setState('phraseRepPenalty', ev.value)}
        />

        <Toggle
          fieldName="tempLast"
          label="Temperature Last"
          helperText="When using Min P, enabling this will make temperature the last sampler to be applied"
          value={props.state.tempLast ?? false}
          service={props.setters.context.service}
          format={props.setters.context.format}
          hide={props.setters.hides.tempLast}
          recommended={props.sub?.preset.tempLast}
          onChange={(ev) => props.setters.setState('tempLast', ev)}
        />

        <Toggle
          fieldName="mirostatToggle"
          label="Use Mirostat"
          helperText={
            <>
              Activates the Mirostat sampling technique. It aims to control perplexity during
              sampling. See the {` `}
              <A class="link" href="https://arxiv.org/abs/2007.14966">
                paper
              </A>
            </>
          }
          value={props.state.mirostatToggle ?? false}
          disabled={props.state.disabled}
          service={props.setters.context.service}
          hide={props.setters.hides.mirostatLR}
          format={props.setters.context.format}
          recommended={props.sub?.preset.mirostatToggle}
          onChange={(ev) => props.setters.setState('mirostatToggle', ev)}
        />

        <Toggle
          fieldName="tokenHealing"
          label="Token Healing"
          helperText="Backs up the generation process by one token then constrains the output's first token to equal the last token of your prompt."
          value={props.state.tokenHealing ?? true}
          disabled={props.state.disabled}
          service={props.setters.context.service}
          hide={props.setters.hides.tokenHealing}
          format={props.setters.context.format}
          recommended={props.sub?.preset.tokenHealing}
          onChange={(ev) => props.setters.setState('tokenHealing', ev)}
        />
        <Toggle
          fieldName="addBosToken"
          label="Add BOS Token"
          helperText="Add begining of sequence token to the start of prompt. Disabling makes the replies more creative."
          value={props.state.addBosToken ?? true}
          disabled={props.state.disabled}
          service={props.setters.context.service}
          hide={props.setters.hides.addBosToken}
          format={props.setters.context.format}
          recommended={props.sub?.preset.addBosToken}
          onChange={(ev) => props.setters.setState('addBosToken', ev)}
        />
        <Toggle
          fieldName="banEosToken"
          label="Ban EOS Token"
          helperText="Ban the end of sequence token. This forces the model to never end the generation prematurely."
          value={props.state.banEosToken ?? false}
          disabled={props.state.disabled}
          service={props.setters.context.service}
          hide={props.setters.hides.banEosToken}
          format={props.setters.context.format}
          recommended={props.sub?.preset.banEosToken}
          onChange={(ev) => props.setters.setState('banEosToken', ev)}
        />
        <Toggle
          fieldName="skipSpecialTokens"
          label="Skip Special Tokens"
          helperText="Some specific models need this unset."
          value={props.state.skipSpecialTokens ?? true}
          disabled={props.state.disabled}
          service={props.setters.context.service}
          format={props.setters.context.format}
          hide={props.setters.hides.skipSpecialTokens}
          recommended={props.sub?.preset.skipSpecialTokens}
          onChange={(ev) => props.setters.setState('skipSpecialTokens', ev)}
        />

        <Toggle
          fieldName="doSample"
          label="DO Sample"
          helperText="If doing contrastive search, disable this."
          value={props.state.doSample ?? true}
          disabled={props.state.disabled}
          service={props.setters.context.service}
          format={props.setters.context.format}
          hide={props.setters.hides.doSample}
          onChange={(ev) => props.setters.setState('doSample', ev)}
        />

        <Toggle
          fieldName="earlyStopping"
          label="Early Stopping"
          helperText="Controls the stopping condition for beam-based methods, like beam-search."
          value={props.state.earlyStopping ?? false}
          disabled={props.state.disabled}
          service={props.setters.context.service}
          format={props.setters.context.format}
          hide={props.setters.hides.earlyStopping}
          onChange={(ev) => props.setters.setState('earlyStopping', ev)}
        />

        <SamplerOrder state={props.state} setters={props.setters} />
      </Card>
    </div>
  )
}

const SamplerOrder: Component<{
  state: PresetState
  setters: PresetFuncs
}> = (props) => {
  const updateValue = (next: SortItem[]) => {
    const nextValue = next.map((n) => +n.value)
    const disabled = next.filter((n) => n.enabled === false).map((n) => n.id)
    props.setters.setState({ order: nextValue, disabledSamplers: disabled })
  }

  const items = createMemo(() => {
    const list: SortItem[] = []
    if (!props.setters.context.service) return list

    const orderMap = samplerServiceMap[props.setters.context.service]
    const inverseMap = inverseSamplerServiceMap[props.setters.context.service]
    const disabled = ensureArray(props.state.disabledSamplers)

    const base = samplerOrders[props.setters.context.service]
      ?.map((o) => orderMap?.[o])
      .filter((o) => o !== undefined)
    const order = ensureArray(props.state.order)
    const set = new Set(order)

    if (!base || !order || !orderMap || !inverseMap) return []

    for (const item of order) {
      if (item === undefined) continue
      const prop = inverseMap[item] as keyof typeof settingLabels
      list.push({
        id: item,
        value: item,
        label: `${settingLabels[prop]}`,
        enabled: !disabled.includes(item),
      })
    }

    for (const item of base) {
      if (item === undefined) continue
      if (set.has(item)) continue
      const prop = inverseMap[item] as keyof typeof settingLabels
      list.push({
        id: item,
        value: item,
        label: `${settingLabels[prop]}`,
        enabled: false,
      })
    }

    return list
  })

  return (
    <div
      classList={{
        hidden: items().length === 0 || props.setters.context.format === 'aphrodite',
      }}
    >
      <Sortable label="Sampler Order" items={items()} onChange={updateValue} />
    </div>
  )
}

function ensureArray(value: any): number[] {
  if (!value) return []
  if (typeof value === 'string') {
    return value
      .split(',')
      .filter((v) => v !== '')
      .map((v) => +v)
  }

  return value.map((v: any) => (typeof v === 'number' ? v : +v)).filter((v: number) => !isNaN(v))
}
