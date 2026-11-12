import { For, Index, Match, Switch, createMemo } from 'solid-js'
import { FormLabel } from './FormLabel'
import TextInput from './TextInput'
import { MinusCircle } from 'lucide-solid'
import Button from './Button'
import { isValidServiceSetting } from './util'
import { InlineRangeInput } from './RangeInput'
import { Field } from './PresetSettings/Fields'
import { PresetParser } from '/common/types/presets'
import Select from './Select'

export const PhraseBias: Field = (props) => {
  const hide = createMemo(() => {
    const isValid = isValidServiceSetting(props.state, 'phraseBias')
    return isValid ? '' : ' hidden'
  })

  const add = () => {
    const next = (props.state.phraseBias || []).concat({ seq: '', bias: 0 })
    props.setters.setState('phraseBias', next)
  }

  const remove = (idx: number) => {
    const curr = props.state.phraseBias || []
    const next = curr.slice(0, idx).concat(curr.slice(idx + 1))
    props.setters.setState('phraseBias', next)
  }

  const change = (prop: 'bias' | 'seq', index: number, value: any) => {
    const next = props.state.phraseBias!.map((t, idx) => {
      if (idx !== index) return t
      const update = { ...t, [prop]: value }
      return update
    })
    props.setters.setState('phraseBias', next)
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
    props.setters.setState('stopSequences', next)
  }

  const removeString = (i: number) => {
    const next = (props.state.stopSequences || []).slice()
    next.splice(i, 1)
    props.setters.setState('stopSequences', next)
  }

  return (
    <div>
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
                  props.setters.setState('stopSequences', next)
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

export const MessageParsers: Field = (props) => {
  const addParser = () => {
    const next = (props.state.parsers || []).concat({ type: 'remove', text: '' })
    props.setters.setState('parsers', next)
  }

  const removeparser = (i: number) => {
    const next = (props.state.parsers || []).slice()
    next.splice(i, 1)
    props.setters.setState('parsers', next)
  }

  const updateParser = (
    i: number,
    update: { type?: PresetParser['type']; text?: string; to?: string }
  ) => {
    const next = props.state.parsers!.map((item, index) => {
      if (index !== i) return item
      return { ...item, ...update }
    })

    props.setters.setState('parsers', next as any)
  }

  return (
    <div>
      <FormLabel
        label={
          <div class="flex gap-2">
            Message Parsers{' '}
            <a class="link" onClick={addParser}>
              Add +
            </a>
          </div>
        }
        helperMarkdown="Alter the text in a message to remove or modify unwanted text. Selecting `+ Prompt` will also alter the prompt."
      />
      <div class="flex flex-col gap-2 text-sm">
        <Index each={props.state.parsers || []}>
          {(each, i) => (
            <div class="flex gap-1 text-sm">
              <Select
                items={[
                  { label: 'Remove', value: 'remove' },
                  { label: 'Remove (+ Prompt)', value: 'remove-prompt' },
                  { label: 'Replace', value: 'replace' },
                  { label: 'Replace (+ Prompt)', value: 'replace-prompt' },
                ]}
                value={each().type}
                onChange={(ev) => updateParser(i, { type: ev.value as any })}
              />
              <Switch>
                <Match when={each().type === 'remove' || each().type === 'remove-prompt'}>
                  <div class="flex w-full gap-1">
                    <TextInput
                      value={each().text}
                      parentClass="w-full"
                      placeholder="Remove text. E.g. \n<|user|>"
                      onChange={(ev) => updateParser(i, { text: ev.currentTarget.value })}
                    />
                  </div>
                </Match>

                <Match when={each().type === 'replace' || each().type === 'replace-prompt'}>
                  <div class="flex w-full gap-1">
                    <TextInput
                      value={each().text}
                      parentClass="w-1/2"
                      placeholder="Text to Replace. E.g. \n<|user|>"
                      onChange={(ev) => updateParser(i, { text: ev.currentTarget.value })}
                    />

                    <TextInput
                      value={each().to}
                      parentClass="w-1/2"
                      placeholder="New Text. E.g. \n<|user|>"
                      onChange={(ev) => updateParser(i, { to: ev.currentTarget.value })}
                    />
                  </div>
                </Match>
              </Switch>
              <Button class="icon-button" schema="clear" onClick={() => removeparser(i)}>
                <MinusCircle />
              </Button>
            </div>
          )}
        </Index>
      </div>
    </div>
  )
}
