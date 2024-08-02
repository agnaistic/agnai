import Sorter from 'sortablejs'
import { Component, createEffect, createMemo, createSignal, For } from 'solid-js'
import TextInput from '../TextInput'
import Select from '../Select'
import { AppSchema } from '../../../common/types/schema'
import { AIAdapter, samplerOrders, settingLabels, ThirdPartyFormat } from '../../../common/adapters'
import { Toggle } from '../Toggle'
import { Card } from '../Card'
import { FormLabel } from '../FormLabel'
import Sortable, { SortItem } from '../Sortable'
import Button from '../Button'
import { A } from '@solidjs/router'
import { samplerServiceMap } from '/common/sampler-order'
import { PresetProps } from './types'

export const ToggleSettings: Component<
  PresetProps & {
    pane: boolean
    format?: ThirdPartyFormat
    tab: string
    sub?: AppSchema.SubscriptionModelOption
  }
> = (props) => {
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
          value={props.inherit?.cfgOppose || ''}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'cfgScale'}
          format={props.format}
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
          value={props.inherit?.phraseRepPenalty || 'aggressive'}
          service={props.service}
          aiSetting="phraseRepPenalty"
          format={props.format}
        />

        <Toggle
          fieldName="tempLast"
          label="Temperature Last"
          helperText="When using Min P, enabling this will make temperature the last sampler to be applied"
          value={props.inherit?.tempLast ?? false}
          service={props.service}
          format={props.format}
          aiSetting="tempLast"
          recommended={props.sub?.preset.tempLast}
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
          value={props.inherit?.mirostatToggle ?? false}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'mirostatLR'}
          format={props.format}
          recommended={props.sub?.preset.mirostatToggle}
        />

        <Toggle
          fieldName="tokenHealing"
          label="Token Healing"
          helperText="Backs up the generation process by one token then constrains the output's first token to equal the last token of your prompt."
          value={props.inherit?.tokenHealing ?? true}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'tokenHealing'}
          format={props.format}
          recommended={props.sub?.preset.tokenHealing}
        />
        <Toggle
          fieldName="addBosToken"
          label="Add BOS Token"
          helperText="Add begining of sequence token to the start of prompt. Disabling makes the replies more creative."
          value={props.inherit?.addBosToken ?? true}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'addBosToken'}
          format={props.format}
          recommended={props.sub?.preset.addBosToken}
        />
        <Toggle
          fieldName="banEosToken"
          label="Ban EOS Token"
          helperText="Ban the end of sequence token. This forces the model to never end the generation prematurely."
          value={props.inherit?.banEosToken ?? false}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'banEosToken'}
          format={props.format}
          recommended={props.sub?.preset.banEosToken}
        />
        <Toggle
          fieldName="skipSpecialTokens"
          label="Skip Special Tokens"
          helperText="Some specific models need this unset."
          value={props.inherit?.skipSpecialTokens ?? true}
          disabled={props.disabled}
          service={props.service}
          aiSetting="skipSpecialTokens"
          format={props.format}
          recommended={props.sub?.preset.skipSpecialTokens}
        />

        <Toggle
          fieldName="doSample"
          label="DO Sample"
          helperText="If doing contrastive search, disable this."
          value={props.inherit?.doSample ?? true}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'doSample'}
          format={props.format}
        />

        <Toggle
          fieldName="earlyStopping"
          label="Early Stopping"
          helperText="Controls the stopping condition for beam-based methods, like beam-search."
          value={props.inherit?.earlyStopping ?? false}
          disabled={props.disabled}
          service={props.service}
          aiSetting={'earlyStopping'}
          format={props.format}
        />

        <SamplerOrder service={props.service} inherit={props.inherit} />
      </Card>
    </div>
  )
}

const SamplerOrder: Component<{
  service?: AIAdapter
  inherit?: Partial<AppSchema.GenSettings>
}> = (props) => {
  const [loaded, setLoaded] = createSignal(false)

  const presetOrder = createMemo(() => {
    if (!props.inherit?.order) return ''
    // Guests persist the string instead of the array for some reason
    if (typeof props.inherit.order === 'string') return props.inherit.order
    return props.inherit.order.join(',')
  })
  const [order, setOrder] = createSignal(presetOrder())

  const [value, setValue] = createSignal(order())
  const [disabled, setDisabled] = createSignal(ensureArray(props.inherit?.disabledSamplers))
  const [sorter, setSorter] = createSignal<Sorter>()

  /**
   * The SamplerOrder component is re-mounted on save for some reason
   * We need to manually handle this to correctly preserve the order and disabled states
   */
  createEffect(() => {
    if (loaded()) return

    const order = props.inherit?.order || ''
    const next = Array.isArray(order) ? order.join(',') : order

    setLoaded(true)
    setOrder(next)
    setValue(next)
    setDisabled(props.inherit?.disabledSamplers || [])
    resort()
  })

  const updateValue = (next: SortItem[]) => {
    setValue(next.map((n) => n.value).join(','))
  }

  const toggleSampler = (id: number) => {
    if (!props.service) return
    const temp = samplerOrders[props.service]?.findIndex((val) => val === 'temp')!

    if (disabled().includes(id)) {
      const next = disabled().filter((sampler) => sampler !== temp && sampler !== id)
      setDisabled(next)
      return
    }

    const next = id === temp ? disabled() : disabled().concat(id)
    setDisabled(next)
  }

  const items = createMemo(() => {
    const list: SortItem[] = []
    if (!props.service) return list

    const order = samplerOrders[props.service]
    const orderMap = samplerServiceMap[props.service]
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
        hidden: items().length === 0 || props.inherit?.thirdPartyFormat === 'aphrodite',
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

      <Card hide={props.service !== 'novel'}>
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
                schema={disabled().includes(+item.id) ? 'secondary' : 'success'}
                onClick={() => toggleSampler(+item.id)}
              >
                {item.label}
              </Button>
            )}
          </For>
        </div>
      </Card>

      <TextInput fieldName="order" parentClass="hidden" value={value()} />
      <TextInput fieldName="disabledSamplers" parentClass="hidden" value={disabled().join(',')} />
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
