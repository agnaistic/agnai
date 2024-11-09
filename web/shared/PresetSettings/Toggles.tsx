import { Component, createMemo } from 'solid-js'
import TextInput from '../TextInput'
import Select from '../Select'
import { samplerOrders, settingLabels } from '../../../common/adapters'
import { Toggle } from '../Toggle'
import { Card } from '../Card'
import Sortable, { SortItem } from '../Sortable'
import { A } from '@solidjs/router'
import { inverseSamplerServiceMap, samplerServiceMap } from '/common/sampler-order'
import { PresetState, PresetTabProps, SetPresetState } from './types'

export const ToggleSettings: Component<PresetTabProps> = (props) => {
  return (
    <div class="flex flex-col gap-4" classList={{ hidden: props.tab !== 'Toggles' }}>
      <Card class="flex flex-col gap-4">
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
          hide={props.hides.cfgScale}
          onChange={(ev) => props.setter('cfgOppose', ev.currentTarget.value)}
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
          hide={props.hides.phraseRepPenalty}
          onChange={(ev) => props.setter('phraseRepPenalty', ev.value)}
        />

        <Toggle
          fieldName="tempLast"
          label="Temperature Last"
          helperText="When using Min P, enabling this will make temperature the last sampler to be applied"
          value={props.state.tempLast ?? false}
          service={props.state.service}
          format={props.state.thirdPartyFormat}
          hide={props.hides.tempLast}
          recommended={props.sub?.preset.tempLast}
          onChange={(ev) => props.setter('tempLast', ev)}
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
          service={props.state.service}
          hide={props.hides.mirostatLR}
          format={props.state.thirdPartyFormat}
          recommended={props.sub?.preset.mirostatToggle}
          onChange={(ev) => props.setter('mirostatToggle', ev)}
        />

        <Toggle
          fieldName="tokenHealing"
          label="Token Healing"
          helperText="Backs up the generation process by one token then constrains the output's first token to equal the last token of your prompt."
          value={props.state.tokenHealing ?? true}
          disabled={props.state.disabled}
          service={props.state.service}
          hide={props.hides.tokenHealing}
          format={props.state.thirdPartyFormat}
          recommended={props.sub?.preset.tokenHealing}
          onChange={(ev) => props.setter('tokenHealing', ev)}
        />
        <Toggle
          fieldName="addBosToken"
          label="Add BOS Token"
          helperText="Add begining of sequence token to the start of prompt. Disabling makes the replies more creative."
          value={props.state.addBosToken ?? true}
          disabled={props.state.disabled}
          service={props.state.service}
          hide={props.hides.addBosToken}
          format={props.state.thirdPartyFormat}
          recommended={props.sub?.preset.addBosToken}
          onChange={(ev) => props.setter('addBosToken', ev)}
        />
        <Toggle
          fieldName="banEosToken"
          label="Ban EOS Token"
          helperText="Ban the end of sequence token. This forces the model to never end the generation prematurely."
          value={props.state.banEosToken ?? false}
          disabled={props.state.disabled}
          service={props.state.service}
          hide={props.hides.banEosToken}
          format={props.state.thirdPartyFormat}
          recommended={props.sub?.preset.banEosToken}
          onChange={(ev) => props.setter('banEosToken', ev)}
        />
        <Toggle
          fieldName="skipSpecialTokens"
          label="Skip Special Tokens"
          helperText="Some specific models need this unset."
          value={props.state.skipSpecialTokens ?? true}
          disabled={props.state.disabled}
          service={props.state.service}
          hide={props.hides.skipSpecialTokens}
          format={props.state.thirdPartyFormat}
          recommended={props.sub?.preset.skipSpecialTokens}
          onChange={(ev) => props.setter('skipSpecialTokens', ev)}
        />

        <Toggle
          fieldName="doSample"
          label="DO Sample"
          helperText="If doing contrastive search, disable this."
          value={props.state.doSample ?? true}
          disabled={props.state.disabled}
          service={props.state.service}
          hide={props.hides.doSample}
          format={props.state.thirdPartyFormat}
          onChange={(ev) => props.setter('doSample', ev)}
        />

        <Toggle
          fieldName="earlyStopping"
          label="Early Stopping"
          helperText="Controls the stopping condition for beam-based methods, like beam-search."
          value={props.state.earlyStopping ?? false}
          disabled={props.state.disabled}
          service={props.state.service}
          hide={props.hides.earlyStopping}
          format={props.state.thirdPartyFormat}
          onChange={(ev) => props.setter('earlyStopping', ev)}
        />

        <SamplerOrder state={props.state} setter={props.setter} />
      </Card>
    </div>
  )
}

const SamplerOrder: Component<{
  state: PresetState
  setter: SetPresetState
}> = (props) => {
  const updateValue = (next: SortItem[]) => {
    const nextValue = next.map((n) => +n.value)
    const disabled = next.filter((n) => n.enabled === false).map((n) => n.id)
    props.setter({ order: nextValue, disabledSamplers: disabled })
  }

  const items = createMemo(() => {
    const list: SortItem[] = []
    if (!props.state.service) return list

    const orderMap = samplerServiceMap[props.state.service]
    const inverseMap = inverseSamplerServiceMap[props.state.service]
    const disabled = ensureArray(props.state.disabledSamplers)

    const base = samplerOrders[props.state.service]
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
        hidden: items().length === 0 || props.state.thirdPartyFormat === 'aphrodite',
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
