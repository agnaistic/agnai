import { Component, createSignal, Index, JSX } from 'solid-js'
import { FormLabel } from './FormLabel'
import { RootModal } from './Modal'
import TextInput from './TextInput'
import Button from './Button'
import { MinusCircle, X } from 'lucide-solid'

export const ListInput: Component<{
  label?: string | JSX.Element
  helperText?: string | JSX.Element
  value: string[]
  setter: (list: string[]) => void
  hide?: boolean
}> = (props) => {
  const [show, setShow] = createSignal(false)

  const addString = () => {
    const next = (props.value || []).concat('')
    props.setter(next)
  }

  const removeString = (i: number) => {
    const next = (props.value || []).slice()
    next.splice(i, 1)
    props.setter(next)
  }

  return (
    <div classList={{ hidden: props.hide }}>
      <FormLabel
        label={
          <div class="flex gap-2">
            {props.label}
            <a class="link" onClick={() => setShow(true)}>
              Edit
            </a>
          </div>
        }
        helperText={props.helperText}
      />

      <div class="flex flex-wrap gap-2">
        <Index each={props.value || []}>
          {(item, i) => (
            <code class="flex items-center gap-2">
              {item()}{' '}
              <div class="cursor-pointer" onClick={() => removeString(i)}>
                <X size={12} />
              </div>
            </code>
          )}
        </Index>
      </div>

      <RootModal
        show={show()}
        close={() => setShow(false)}
        title="DRY Sequence Breakers"
        footer={
          <>
            <Button onClick={() => setShow(false)}>Close</Button>
          </>
        }
      >
        <p>
          Words and phrases that can be repeated. Such as nicknames, pet names, terms of endearment.
        </p>
        <div class="flex flex-col gap-2 text-sm">
          <Button onClick={addString}>Add Phrase</Button>
          <Index each={props.value || []}>
            {(each, i) => (
              <div class="flex w-full gap-1">
                <TextInput
                  value={each()}
                  parentClass="w-full"
                  placeholder="Word or phrase"
                  onChange={(ev) => {
                    const next = props.value.map((t, idx) =>
                      idx === i ? ev.currentTarget.value : t
                    )
                    props.setter(next)
                  }}
                />
                <Button class="icon-button" schema="clear" onClick={() => removeString(i)}>
                  <MinusCircle />
                </Button>
              </div>
            )}
          </Index>
        </div>
      </RootModal>
    </div>
  )
}
