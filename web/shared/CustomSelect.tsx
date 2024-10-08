import { Component, For, JSX, Show, createMemo, createSignal, onMount } from 'solid-js'
import { FormLabel } from './FormLabel'
import Button, { ButtonSchema } from './Button'
import { RootModal } from './Modal'
import { PresetAISettings } from '/common/adapters'
import { ComponentSubscriber, useValidServiceSetting } from './util'
import { forms } from '../emitter'
import TextInput from './TextInput'

export type CustomOption = {
  label: string | JSX.Element
  value: any
}

export const CustomSelect: Component<{
  buttonLabel: string | JSX.Element | ((opt: CustomOption) => JSX.Element | string)
  onSelect: (opt: CustomOption) => void
  options: CustomOption[]
  value: any

  header?: JSX.Element

  schema?: ButtonSchema
  size?: 'sm' | 'md' | 'lg' | 'pill'
  modalTitle?: string | JSX.Element
  label?: string | JSX.Element
  helperText?: string | JSX.Element
  fieldName?: string
  selected: any | undefined
  hide?: boolean
  aiSetting?: keyof PresetAISettings
  parentClass?: string
  classList?: Record<string, boolean>
  emitter?: ComponentSubscriber<'close'>
  search?: (value: string, search: string) => boolean
}> = (props) => {
  let ref: HTMLInputElement
  const [open, setOpen] = createSignal(false)

  const show = useValidServiceSetting(props.aiSetting)

  onMount(() => {
    if (props.emitter) {
      props.emitter('close', () => setOpen(false))
    }
  })

  const onSelect = (opt: CustomOption) => {
    if (props.fieldName) {
      forms.emit(props.fieldName, opt.value)
    }

    if (ref) {
      ref.value = opt.value
    }
    props.onSelect(opt)
    setOpen(false)
  }

  const buttonLabel = createMemo(() => {
    const opt = props.selected

    if (typeof props.buttonLabel !== 'function') {
      return props.buttonLabel
    }

    return props.buttonLabel(opt)
  })

  return (
    <div
      class={`max-w-full ${props.parentClass || ''}`}
      classList={{ ...props.classList, hidden: !show() || props.hide }}
    >
      <Show when={props.fieldName}>
        <input
          ref={ref!}
          type="hidden"
          id={props.fieldName}
          name={props.fieldName}
          value={props.value}
        />
      </Show>

      <div class="flex flex-col text-sm">
        <FormLabel label={props.label} helperText={props.helperText} />

        <Button
          schema={props.schema}
          size={props.size}
          alignLeft
          onClick={() => setOpen(true)}
          class="w-fit"
        >
          {buttonLabel()}
        </Button>
      </div>
      <RootModal show={open()} close={() => setOpen(false)} title={props.modalTitle}>
        <div class="flex flex-col gap-4">
          <div class="flex flex-wrap gap-2 pr-3">
            <OptionList
              header={props.header}
              options={props.options}
              onSelect={onSelect}
              selected={props.selected}
              search={props.search}
            />
          </div>
        </div>
      </RootModal>
    </div>
  )
}

const OptionList: Component<{
  search?: (text: string, search: string) => boolean
  options: CustomOption[]
  onSelect: (opt: CustomOption) => void
  title?: string
  selected?: string
  header?: JSX.Element
}> = (props) => {
  const [filter, setFilter] = createSignal('')

  const filtered = createMemo(() => {
    if (!props.search) return props.options

    const input = filter().trim()
    if (!input) return props.options

    return props.options.filter((opt) =>
      typeof opt.label === 'string'
        ? props.search?.(opt.label, input) || props.search?.(opt.value, input)
        : props.search?.(opt.value, input)
    )
  })

  return (
    <div class={`flex w-full flex-col gap-2`}>
      <Show when={props.title}>
        <div class="text-md">{props.title}</div>
      </Show>

      <Show when={props.header}>{props.header}</Show>

      <Show when={props.search}>
        <TextInput
          parentClass="text-sm"
          fieldName="options-filter"
          placeholder="Filter..."
          onChange={(ev) => setFilter(ev.currentTarget.value)}
          onInputText={(text) => setFilter(text)}
        />
      </Show>

      <div class={`flex flex-col gap-2 p-2`}>
        <For each={filtered()}>
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
}
