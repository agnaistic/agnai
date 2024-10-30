import Sorter from 'sortablejs'
import { Component, createEffect, createMemo, createSignal, For } from 'solid-js'
import TextInput from '../TextInput'
import Select from '../Select'
import { samplerOrders, settingLabels } from '../../../common/adapters'
import { Toggle } from '../Toggle'
import { Card } from '../Card'
import { FormLabel } from '../FormLabel'
import Sortable, { SortItem } from '../Sortable'
import Button from '../Button'
import { A } from '@solidjs/router'
import { samplerServiceMap } from '/common/sampler-order'
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
          aiSetting={'cfgScale'}
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
          aiSetting="phraseRepPenalty"
          onChange={(ev) => props.setter('phraseRepPenalty', ev.value)}
        />

        <Toggle
          fieldName="tempLast"
          label="Temperature Last"
          helperText="When using Min P, enabling this will make temperature the last sampler to be applied"
          value={props.state.tempLast ?? false}
          service={props.state.service}
          format={props.state.thirdPartyFormat}
          aiSetting="tempLast"
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
          aiSetting={'mirostatLR'}
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
          aiSetting={'tokenHealing'}
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
          aiSetting={'addBosToken'}
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
          aiSetting={'banEosToken'}
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
          aiSetting="skipSpecialTokens"
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
          aiSetting={'doSample'}
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
          aiSetting={'earlyStopping'}
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
  const [loaded, setLoaded] = createSignal(false)

  const presetOrder = createMemo(() => {
    if (!props.state.order) return ''
    // Guests persist the string instead of the array for some reason
    if (typeof props.state.order === 'string') return props.state.order
    return props.state.order.join(',')
  })
  const [order, setOrder] = createSignal(presetOrder())

  const [value, setValue] = createSignal(order())
  const [sorter, setSorter] = createSignal<Sorter>()

  /**
   * The SamplerOrder component is re-mounted on save for some reason
   * We need to manually handle this to correctly preserve the order and disabled states
   */
  createEffect(() => {
    if (loaded()) return

    const order = props.state.order || ''
    const next = Array.isArray(order) ? order.join(',') : order

    setLoaded(true)
    setOrder(next)
    setValue(next)
    resort()
  })

  const updateValue = (next: SortItem[]) => {
    const nextValue = next.map((n) => +n.value)
    props.setter('order', nextValue)
  }

  const toggleSampler = (id: number) => {
    if (!props.state.service) return
    const temp = samplerOrders[props.state.service]?.findIndex((val) => val === 'temp')!

    const disabled = ensureArray(props.state.disabledSamplers)

    if (disabled.includes(id)) {
      const next = disabled.filter((sampler) => sampler !== temp && sampler !== id)
      props.setter('disabledSamplers', next)
      return
    }

    const next = id === temp ? disabled : disabled.concat(id)
    props.setter('disabledSamplers', next)
  }

  const items = createMemo(() => {
    const list: SortItem[] = []
    if (!props.state.service) return list

    const order = samplerOrders[props.state.service]
    const orderMap = samplerServiceMap[props.state.service]
    if (!order || !orderMap) return []

    for (const item of order) {
      list.push({
        id: orderMap[item],
        value: item,
        label: settingLabels[item]!,
      })
    }

    return list
  })

  const resort = () => {
    const sort = sorter()
    if (!sort) return

    sort.sort(value().split(','))
  }

  return (
    <div
      classList={{
        hidden: items().length === 0 || props.state.thirdPartyFormat === 'aphrodite',
      }}
    >
      <Sortable
        label="Sampler Order"
        items={items()}
        onChange={updateValue}
        setSorter={(s) => {
          setSorter(s)
          resort()
        }}
      />

      <Card hide={props.state.service !== 'novel'}>
        <FormLabel
          fieldName="disabledSamplers"
          label="Enabled Samplers"
          helperText="To disable a sampler, toggle it to grey."
        />

        <div class="flex flex-wrap gap-2">
          <For each={items()}>
            {(item) => (
              <Button
                size="sm"
                schema={
                  ensureArray(props.state.disabledSamplers).includes(+item.id)
                    ? 'secondary'
                    : 'success'
                }
                onClick={() => toggleSampler(+item.id)}
              >
                {item.label}
              </Button>
            )}
          </For>
        </div>
      </Card>
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

  return value.map((v: any) => (typeof v === 'number' ? v : +v)).filter((v: number) => isNaN(v))
}
