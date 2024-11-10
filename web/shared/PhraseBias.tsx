import { For, Index, createMemo } from 'solid-js'
import { FormLabel } from './FormLabel'
import TextInput from './TextInput'
import { MinusCircle } from 'lucide-solid'
import Button from './Button'
import { isValidServiceSetting } from './util'
import { InlineRangeInput } from './RangeInput'
import { Field } from './PresetSettings/Fields'

export const PhraseBias: Field = (props) => {
  const hide = createMemo(() => {
    const isValid = isValidServiceSetting(props.state, 'phraseBias')
    return isValid ? '' : ' hidden'
  })

  const add = () => {
    const next = (props.state.phraseBias || []).concat({ seq: '', bias: 0 })
    props.setter('phraseBias', next)
  }

  const remove = (idx: number) => {
    const curr = props.state.phraseBias || []
    const next = curr.slice(0, idx).concat(curr.slice(idx + 1))
    props.setter('phraseBias', next)
  }

  const change = (prop: 'bias' | 'seq', index: number, value: any) => {
    const next = props.state.phraseBias!.map((t, idx) => {
      if (idx !== index) return t
      const update = { ...t, [prop]: value }
      return update
    })
    props.setter('phraseBias', next)
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
      <For each={props.state.phraseBias || []}>
        {(each, i) => (
          <div class="flex w-full gap-2">
            <TextInput
              parentClass="w-full"
              fieldName={`phraseBias.${i()}.seq`}
              value={each.seq}
              placeholder="E.g. \nBob:"
              onChange={(ev) => change('seq', i(), ev.currentTarget.value)}
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
              onChange={(ev) => change('bias', i(), ev)}
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

export const StoppingStrings: Field = (props) => {
  const addString = () => {
    const next = (props.state.stopSequences || []).concat('')
    props.setter('stopSequences', next)
  }

  const removeString = (i: number) => {
    const next = (props.state.stopSequences || []).slice()
    next.splice(i, 1)
    props.setter('stopSequences', next)
  }

  return (
    <div classList={{ hidden: props.hides.stopSequences ?? false }}>
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
        <Index each={props.state.stopSequences || []}>
          {(each, i) => (
            <div class="flex w-full gap-1">
              <TextInput
                value={each()}
                parentClass="w-full"
                placeholder="E.g. \n<|user|>"
                onChange={(ev) => {
                  const next = props.state.stopSequences!.map((t, idx) =>
                    idx === i ? ev.currentTarget.value : t
                  )
                  props.setter('stopSequences', next)
                }}
              />
              <Button class="icon-button" schema="clear" onClick={() => removeString(i)}>
                <MinusCircle />
              </Button>
            </div>
          )}
        </Index>
      </div>
    </div>
  )
}
