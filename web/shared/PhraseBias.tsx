import { Component, For, createMemo, createSignal } from 'solid-js'
import { AppSchema } from '/common/types'
import { AIAdapter, ThirdPartyFormat } from '/common/adapters'
import { FormLabel } from './FormLabel'
import TextInput from './TextInput'
import { MinusCircle } from 'lucide-solid'
import Button from './Button'
import { isValidServiceSetting } from './util'
import { InlineRangeInput } from './RangeInput'

export const PhraseBias: Component<{
  inherit?: Partial<AppSchema.GenSettings>
  service?: AIAdapter
  format?: ThirdPartyFormat
}> = (props) => {
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
          <>
            Phrase Bias{' '}
            <a class="link" onClick={add}>
              Add +
            </a>
          </>
        }
        helperText="Increase or decrease the likelihood of certain text appearing in responses. Lower values decrease the chance."
      />
      <For each={biases()}>
        {(each, i) => (
          <div class="flex w-full gap-2">
            <TextInput
              parentClass="w-full"
              fieldName={`phraseBias.${i()}.seq`}
              value={each.seq}
              placeholder="E.g. \nBob:"
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
  const [strings, setStrings] = createSignal<string[]>(props.inherit?.stopSequences || [''])

  const addString = () => {
    const next = strings().concat('')
    setStrings(next)
  }

  const removeString = (i: number) => {
    const next = strings()
    next.splice(i, 1)
    setStrings(next.slice(0, i).concat(next.slice(i + 1)))
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
            Stop Sequences{' '}
            <a class="link" onClick={addString}>
              Add +
            </a>
          </div>
        }
        helperText="Text that causes the response to complete early. All participant names are included by default."
      />
      <div class="flex flex-col gap-2 text-sm">
        <For each={strings()}>
          {(each, i) => (
            <div class="flex w-full gap-1">
              <TextInput
                fieldName={`stop.${i()}`}
                value={each}
                parentClass="w-full"
                placeholder="E.g. \n<|user|>"
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
