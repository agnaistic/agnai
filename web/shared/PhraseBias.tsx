import { Component, For, createEffect, createSignal } from 'solid-js'
import { clamp } from '/common/util'
import { AppSchema } from '/common/types'
import { AIAdapter, ThirdPartyFormat } from '/common/adapters'
import { FormLabel } from './FormLabel'
import TextInput from './TextInput'
import { MinusCircle } from 'lucide-solid'
import Button from './Button'

export { PhraseBias as default }

const PhraseBias: Component<{ value?: number; clamp?: number }> = (props) => {
  const [value, setValue] = createSignal(props.value ?? 0)

  createEffect(() => {
    if (props.clamp === undefined) return
    const val = clamp(value(), props.clamp)
    setValue(val)
  })

  return null
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

  return (
    <>
      <FormLabel
        label={
          <div class="flex gap-1">
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
    </>
  )
}
