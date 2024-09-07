import { Component, For, JSX, Show, createMemo, createSignal } from 'solid-js'
import { FormLabel } from './FormLabel'
import Button from './Button'
import { RootModal } from './Modal'
import { AIAdapter, PresetAISettings, ThirdPartyFormat } from '/common/adapters'
import { isValidServiceSetting } from './util'

export type CustomOption = {
  label: string | JSX.Element
  value: any
}

export const CustomSelect: Component<{
  buttonLabel: string | JSX.Element
  modalTitle?: string
  label?: string | JSX.Element
  helperText?: string | JSX.Element
  fieldName?: string
  options: CustomOption[]
  selected: any | undefined
  onSelect: (opt: CustomOption) => void
  hide?: boolean
  service?: AIAdapter
  format?: ThirdPartyFormat
  aiSetting?: keyof PresetAISettings
  parentClass?: string
  classList?: Record<string, boolean>
  value: any
}> = (props) => {
  let ref: HTMLInputElement
  const [open, setOpen] = createSignal(false)

  const hide = createMemo(() => {
    if (props.hide) return ' hidden'
    const isValid = isValidServiceSetting(props.service, props.format, props.aiSetting)
    return isValid ? '' : ' hidden'
  })

  const onSelect = (opt: CustomOption) => {
    if (ref) {
      ref.value = opt.value
    }
    props.onSelect(opt)
  }

  return (
    <div class={`${hide()} max-w-full ${props.parentClass || ''}`} classList={props.classList}>
      <Show when={props.fieldName}>
        <input
          ref={ref!}
          type="hidden"
          id={props.fieldName}
          name={props.fieldName}
          value={props.value}
        />
      </Show>
      <div class="flex flex-col py-3 text-sm">
        <FormLabel label={props.label} helperText={props.helperText} />

        <Button alignLeft onClick={() => setOpen(true)} class="w-fit">
          {props.buttonLabel}
        </Button>
      </div>
      <RootModal show={open()} close={() => setOpen(false)} title={props.modalTitle}>
        <div class="flex flex-col gap-4">
          <div class="flex flex-wrap gap-2 pr-3">
            <OptionList options={props.options} onSelect={onSelect} selected={props.selected} />
          </div>
        </div>
      </RootModal>
    </div>
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
