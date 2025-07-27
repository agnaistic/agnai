import {
  Component,
  For,
  JSX,
  Match,
  Show,
  Switch,
  createEffect,
  createMemo,
  createSignal,
  onMount,
} from 'solid-js'
import { FormLabel } from './FormLabel'
import Button, { ButtonSchema } from './Button'
import { RootModal } from './Modal'
import { ComponentSubscriber } from './util'
import TextInput from './TextInput'

export type CustomOption = {
  label: string | JSX.Element
  value: any
  disabled?: boolean
}

export const CustomSelect: Component<{
  buttonLabel?: string | JSX.Element | ((opt: CustomOption) => JSX.Element | string)
  onSelect: (opt: CustomOption) => void
  options?: CustomOption[]
  categories?: Array<{ name: string; options: CustomOption[] }>
  // value: any
  maxHeight?: boolean

  header?: JSX.Element

  schema?: ButtonSchema
  size?: 'sm' | 'md' | 'lg' | 'pill'
  modalTitle?: string | JSX.Element
  label?: string | JSX.Element
  helperText?: string | JSX.Element
  selected: any | undefined
  hide?: boolean
  parentClass?: string
  buttonParentClass?: string
  buttonClass?: string
  classList?: Record<string, boolean>
  search?: (value: string, search: string) => boolean
  disabled?: boolean
  footer?: any
  children?: any

  closeSub?: ComponentSubscriber<'close'>
  openSub?: ComponentSubscriber<'open'>
}> = (props) => {
  const [open, setOpen] = createSignal(false)
  const [filter, setFilter] = createSignal('')

  onMount(() => {
    if (props.closeSub) {
      props.closeSub('close', () => setOpen(false))
    }

    if (props.openSub) {
      props.openSub('open', () => setOpen(true))
    }
  })

  createEffect(() => {
    const isOpening = open()
    if (isOpening) {
      setFilter('')
    }
  })

  const onSelect = (opt: CustomOption) => {
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

  const filteredOpts = createMemo(() => {
    if (!props.options) return

    const input = filter().trim().toLowerCase()
    if (!input) return props.options

    return props.options.filter((opt) =>
      typeof opt.label === 'string'
        ? props.search?.(opt.label.toLowerCase(), input) ||
          props.search?.(typeof opt.value === 'string' ? opt.value.toLowerCase() : opt.value, input)
        : props.search?.(typeof opt.value === 'string' ? opt.value.toLowerCase() : opt.value, input)
    )
  })

  const filteredCats = createMemo(() => {
    if (!props.categories) return

    const input = filter().trim()
    if (!input) return props.categories

    return props.categories.map((cat) => {
      const options = cat.options.filter((opt) =>
        typeof opt.label === 'string'
          ? props.search?.(opt.label, input) || props.search?.(opt.value, input)
          : props.search?.(opt.value, input)
      )

      return { name: cat.name, options }
    })
  })

  return (
    <div
      class={`max-w-full ${props.parentClass || ''}`}
      classList={{ ...props.classList, hidden: props.hide ?? false }}
    >
      <div class={'flex flex-col text-sm ' + (props.buttonParentClass || '')}>
        <FormLabel label={props.label} helperText={props.helperText} />

        <div class="flex gap-1">
          <Show when={props.buttonLabel}>
            <Button
              schema={props.schema}
              size={props.size}
              alignLeft
              onClick={() => setOpen(true)}
              class={props.buttonClass || ''}
              // class="w-fit max-w-fit"
              disabled={props.disabled}
            >
              {buttonLabel()}
            </Button>
          </Show>
          {props.children}
        </div>
      </div>
      <RootModal
        show={open()}
        close={() => setOpen(false)}
        title={props.modalTitle}
        maxHeight={props.maxHeight}
        footer={props.footer}
      >
        <div class="flex flex-col gap-4">
          <Show when={props.search}>
            <TextInput
              parentClass="text-sm"
              fieldName="options-filter"
              placeholder="Filter..."
              onChange={(ev) => setFilter(ev.currentTarget.value)}
              value={filter()}
            />
          </Show>

          <Show when={!!props.categories && !!props.header}>{props.header}</Show>

          <Show when={props.categories}>
            <For each={filteredCats()}>
              {(category) => (
                <div
                  class="flex flex-wrap gap-2 pr-3"
                  classList={{ hidden: category.options.length === 0 }}
                >
                  <div class="bold text-md">{category.name}</div>
                  <OptionList
                    options={category.options}
                    onSelect={onSelect}
                    selected={props.selected}
                  />
                </div>
              )}
            </For>
          </Show>
          <Show when={filteredOpts()}>
            <div class="flex flex-wrap gap-2 pr-3">
              <OptionList
                header={props.header}
                options={filteredOpts()!}
                onSelect={onSelect}
                selected={props.selected}
              />
            </div>
          </Show>
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
  header?: JSX.Element
}> = (props) => {
  return (
    <Switch>
      <Match when={props.options.length === 0}>{null}</Match>
      <Match when>
        <div class={`flex w-full flex-col gap-2`}>
          <Show when={props.title}>
            <div class="text-md">{props.title}</div>
          </Show>

          <Show when={props.header}>{props.header}</Show>

          <div class={`flex flex-col gap-2 p-2`}>
            <For each={props.options}>
              {(option) => (
                <div
                  classList={{
                    'bg-[var(--hl-800)]': props.selected === option.value,
                    'bg-700': !option.disabled && props.selected !== option.value,
                    'bg-[var(--error-900)] text-700':
                      option.disabled && props.selected !== option.value,
                    'cursor-not-allowed': option.disabled,
                    'cursor-pointer': !option.disabled,
                  }}
                  class={`w-full gap-4 rounded-md px-2 py-1 text-sm`}
                  onClick={() => {
                    if (!option.disabled) {
                      props.onSelect(option)
                    }
                  }}
                >
                  <div class="font-bold">{option.label}</div>
                </div>
              )}
            </For>
          </div>
        </div>
      </Match>
    </Switch>
  )
}
