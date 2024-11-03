import { Component, Index } from 'solid-js'
import TextInput from '/web/shared/TextInput'
import { MinusCircle, Plus } from 'lucide-solid'
import Button from '/web/shared/Button'

export const AlternateGreetingsInput: Component<{
  greetings: string[]
  setGreetings: (next: string[]) => void
}> = (props) => {
  const addGreeting = () => props.setGreetings([...props.greetings, ''])
  const removeGreeting = (i: number) => {
    return props.setGreetings(props.greetings.slice(0, i).concat(props.greetings.slice(i + 1)))
  }

  const onChange = (ev: { currentTarget: HTMLInputElement | HTMLTextAreaElement }, i: number) => {
    props.setGreetings(
      props.greetings.map((orig, j) => (j === i ? ev.currentTarget?.value ?? '' : orig))
    )
  }

  return (
    <>
      <Index each={props.greetings}>
        {(altGreeting, i) => (
          <div class="flex gap-2">
            <TextInput
              isMultiline
              fieldName={`alternateGreeting${i + 1}`}
              placeholder="An alternate greeting for your character"
              value={altGreeting()}
              onChange={(ev) => onChange(ev, i)}
              parentClass="w-full"
            />
            <div class="1/12 flex items-center" onClick={() => removeGreeting(i)}>
              <MinusCircle size={16} class="focusable-icon-button" />
            </div>
          </div>
        )}
      </Index>
      <div>
        <Button onClick={addGreeting}>
          <Plus size={16} />
          Add Alternate Greeting
        </Button>
      </div>
    </>
  )
}
