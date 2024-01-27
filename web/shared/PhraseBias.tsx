import { Component, For, createMemo, createSignal } from 'solid-js'
import { AppSchema } from '/common/types'
import { AIAdapter, ThirdPartyFormat } from '/common/adapters'
import { FormLabel } from './FormLabel'
import TextInput from './TextInput'
import { MinusCircle } from 'lucide-solid'
import Button from './Button'
import { isValidServiceSetting } from './util'
import { InlineRangeInput } from './RangeInput'
import { Trans, useTransContext } from '@mbarzda/solid-i18next'

export const PhraseBias: Component<{
  inherit?: Partial<AppSchema.GenSettings>
  service?: AIAdapter
  format?: ThirdPartyFormat
}> = (props) => {
  const [t] = useTransContext()

  const [biases, setBiases] = createSignal<Array<{ seq: string; bias: number }>>(
    props.inherit?.phraseBias || []
  )

  const hide = createMemo(() => {
    const isValid = isValidServiceSetting(props.service, props.format, 'phraseBias')
    return isValid ? '' : ' hidden'
  })

  const add = () => {
    const next = biases().concat({ seq: '', bias: 0 })
    setBiases(next)
  }

  const remove = (idx: number) => {
    const curr = biases()
    const next = curr.slice(0, idx).concat(curr.slice(idx + 1))
    setBiases(next)
  }

  return (
    <div class={`${hide()} flex flex-col gap-2`}>
      <FormLabel
        label={
          <Trans key="phrase_bias">
            Phrase Bias
            <a class="link" onClick={add}>
              Add +
            </a>
          </Trans>
        }
        helperText={t('phrase_bias_message')}
      />
      <For each={biases()}>
        {(each, i) => (
          <div class="flex w-full gap-2">
            <TextInput
              parentClass="w-full"
              fieldName={`phraseBias.${i()}.seq`}
              value={each.seq}
              placeholder={t('phrase_bias_example')}
            />
            {/* <TextInput
              parentClass="w-24"
              type="number"
              fieldName={`phraseBias.${i()}.bias`}
              value={each.bias || 0}
              step={0.1}
            /> */}
            <InlineRangeInput
              fieldName={`phraseBias.${i()}.bias`}
              value={each.bias || 0}
              min={-2}
              max={2}
              step={0.1}
            />
            <Button class="icon-button" schema="clear" onClick={() => remove(i())}>
              <MinusCircle />
            </Button>
          </div>
        )}
      </For>
    </div>
  )
}

export const StoppingStrings: Component<{
  inherit?: Partial<AppSchema.GenSettings>
  service?: AIAdapter
  format?: ThirdPartyFormat
}> = (props) => {
  const [t] = useTransContext()

  const [strings, setStrings] = createSignal<string[]>(props.inherit?.stopSequences || [''])

  const addString = () => {
    const next = strings().concat('')
    setStrings(next)
  }

  const removeString = (i: number) => {
    const next = strings()
    next.splice(i, 1)
    setStrings(next.slice())
  }

  const hide = createMemo(() => {
    const isValid = isValidServiceSetting(props.service, props.format, 'stopSequences')
    return isValid ? '' : ' hidden'
  })

  return (
    <div class={hide()}>
      <FormLabel
        label={
          <div class="flex gap-2">
            <Trans key="stop_sequences">
              Stop Sequences
              <a class="link" onClick={addString}>
                Add +
              </a>
            </Trans>
          </div>
        }
        helperText={t('stop_sequences_message')}
      />
      <div class="flex flex-col gap-2 text-sm">
        <For each={strings()}>
          {(each, i) => (
            <div class="flex w-full gap-1">
              <TextInput
                fieldName={`stop.${i()}`}
                value={each}
                parentClass="w-full"
                placeholder={t('stop_sequences_example')}
                onChange={(ev) => {
                  const next = strings().map((t, idx) => (idx === i() ? ev.currentTarget.value : t))
                  setStrings(next)
                }}
              />
              <Button class="icon-button" schema="clear" onClick={() => removeString(i())}>
                <MinusCircle />
              </Button>
            </div>
          )}
        </For>
      </div>
    </div>
  )
}
