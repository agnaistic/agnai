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
  on,
  onCleanup,
  onMount,
} from 'solid-js'
import { FormLabel } from './FormLabel'
import Button, { ButtonSchema } from './Button'
import { RootModal } from './Modal'
import { ComponentSubscriber, PartialListener } from './util'
import TextInput from './TextInput'

export type OptionAction = { comp: (props: { optionValue: string }) => JSX.Element }

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
  autoSearch?: boolean
  disabled?: boolean
  footer?: any

  preoptions?: JSX.Element
  postoptions?: JSX.Element
  children?: any

  listener?: PartialListener<'close' | 'open'>
  closeSub?: ComponentSubscriber<'close'>
  openSub?: ComponentSubscriber<'open'>
  actions?: OptionAction[]
  searchText?: (input: string) => void
}> = (props) => {
  const [open, setOpen] = createSignal(false)
  const [filter, setFilter] = createSignal('')
  const [unsubs, setUnsubs] = createSignal<Function[]>([])

  onMount(() => {
    if (props.closeSub) {
      const unsub = props.closeSub('close', () => setOpen(false))
      setUnsubs((v) => v.concat(unsub))
    }

    if (props.openSub) {
      const unsub = props.openSub('open', () => setOpen(true))
      setUnsubs((v) => v.concat(unsub))
    }

    props.listener?.open?.()
  })

  onCleanup(() => {
    for (const unsub of unsubs()) {
      unsub()
    }

    props.listener?.close?.()
  })

  createEffect(
    on(
      () => open(),
      () => {
        const isOpening = open()
        if (isOpening) {
          setFilter('')
        }
      }
    )
  )

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

    const searchFunc = props.search || fallbackSearch

    return props.options.filter((opt) =>
      typeof opt.label === 'string'
        ? searchFunc(opt.label.toLowerCase(), input) ||
          searchFunc(typeof opt.value === 'string' ? opt.value.toLowerCase() : opt.value, input)
        : searchFunc(typeof opt.value === 'string' ? opt.value.toLowerCase() : opt.value, input)
    )
  })

  const filteredCats = createMemo(() => {
    if (!props.categories) return

    const input = filter().trim()
    if (!input) return props.categories

    const searchFunc = props.search || fallbackSearch

    return props.categories.map((cat) => {
      const options = cat.options.filter((opt) =>
        typeof opt.label === 'string'
          ? searchFunc(opt.label, input) || props.search?.(opt.value, input)
          : searchFunc(opt.value, input)
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
          <Show when={props.search || props.autoSearch === true}>
            <TextInput
              parentClass="text-sm"
              fieldName="options-filter"
              placeholder="Filter..."
              onChange={(ev) => {
                setFilter(ev.currentTarget.value)
                props.searchText?.(ev.currentTarget.value)
              }}
              value={filter()}
            />
          </Show>

          {props.preoptions}

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
                    actions={props.actions}
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
                actions={props.actions}
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
  actions?: OptionAction[]
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
                <div class="flex w-full gap-1">
                  <div
                    classList={{
                      'bg-[var(--hl-800)]': props.selected === option.value,
                      'bg-700': !option.disabled && props.selected !== option.value,
                      'bg-[var(--error-900)] text-700':
                        option.disabled && props.selected !== option.value,
                      'cursor-not-allowed': option.disabled,
                      'cursor-pointer': !option.disabled,
                    }}
                    class={`flex w-full gap-4 rounded-md px-2 py-1 text-sm`}
                    onClick={() => {
                      if (!option.disabled) {
                        props.onSelect(option)
                      }
                    }}
                  >
                    <div class="font-bold">{option.label}</div>
                  </div>
                  <For each={props.actions || []}>
                    {(action) => action.comp({ optionValue: option.value })}
                  </For>
                </div>
              )}
            </For>
          </div>
        </div>
      </Match>
    </Switch>
  )
}

function fallbackSearch(value: string, search: string) {
  const lower = value.toLowerCase()
  if (lower.includes(search.toLowerCase())) return true

  const splits = search.trim().split(' ')
  for (const split of splits) {
    if (!lower.includes(split)) return false
  }

  return true
}
