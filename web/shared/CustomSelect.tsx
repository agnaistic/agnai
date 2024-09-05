import { Component, For, JSX, Show, createMemo, createSignal } from 'solid-js'
import { FormLabel } from './FormLabel'
import TextInput from './TextInput'
import Button from './Button'
import { RootModal } from './Modal'

export type CustomOption = {
  label: string | JSX.Element
  value: any
}

export const CustomSelect: Component<{
  label?: string
  helperText?: string
  fieldName?: string
  options: CustomOption[]
  selected?: any
  onSelect: (opt: CustomOption) => void
}> = (props) => {
  const [open, setOpen] = createSignal(false)

  const selectedLabel = createMemo(() => {
    const opt = props.options.find((o) => o.value === props.selected)
    return opt === undefined ? 'None' : opt.label
  })

  return (
    <>
      <div class="flex flex-col gap-2 py-3 text-sm">
        <Show
          when={props.label && props.helperText}
          fallback={<div class="text-lg">{props.label || ''}</div>}
        >
          <FormLabel label={props.label} helperText={props.helperText} />
        </Show>

        <Show when={props.fieldName}>
          <TextInput class="hidden" fieldName={props.fieldName!} value={props.selected} />
        </Show>

        <div class="flex w-full gap-2">
          <Button onClick={() => setOpen(true)} class="w-fit">
            <strong>{selectedLabel()}</strong>
          </Button>
        </div>
      </div>
      <RootModal show={open()} close={() => setOpen(false)} title="Choose a preset">
        <div class="flex flex-col gap-4">
          <div class="flex flex-wrap gap-2 pr-3">
            <OptionList
              options={props.options}
              onSelect={props.onSelect}
              selected={props.selected}
            />
          </div>
        </div>
      </RootModal>
    </>
  )
}

const OptionList: Component<{
  options: CustomOption[]
  onSelect: (opt: CustomOption) => void
  title?: string
  selected?: string
}> = (props) => (
  <div class={`flex w-full flex-col gap-2`}>
    <Show when={props.title}>
      <div class="text-md">{props.title}</div>
    </Show>
    <div class={`flex flex-col gap-2 p-2`}>
      <For each={props.options}>
        {(option) => (
          <div
            classList={{
              'bg-[var(--hl-800)]': props.selected === option.value,
              'bg-700': props.selected !== option.value,
            }}
            class={`w-full cursor-pointer gap-4 rounded-md px-2 py-1 text-sm`}
            onClick={() => props.onSelect(option)}
          >
            <div class="font-bold">{option.label}</div>
          </div>
        )}
      </For>
    </div>
  </div>
)
