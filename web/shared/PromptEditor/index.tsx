import { Component, For, createEffect, createMemo, createSignal, onMount } from 'solid-js'
import { FormLabel } from '../FormLabel'
import { AIAdapter } from '/common/adapters'
import { getAISettingServices } from '../util'

type Placeholder = {
  required: boolean
  limit: number
}

const placeholders: Record<string, Placeholder> = {
  char: { required: false, limit: Infinity },
  user: { required: false, limit: Infinity },
  history: { required: true, limit: 1 },
  scenario: { required: true, limit: 1 },
  memory: { required: false, limit: 1 },
  personality: { required: true, limit: 1 },
  ujb: { required: false, limit: 1 },
  post: { required: true, limit: 1 },
  example_dialogue: { required: false, limit: 1 },
} satisfies Record<string, Placeholder>

type HolderName = keyof typeof placeholders

const PromptEditor: Component<{
  fieldName: string
  service?: AIAdapter
  exclude?: HolderName[]
  disabled?: boolean
  value?: string
  onChange?: (value: string) => void
}> = (props) => {
  let ref: HTMLTextAreaElement = null as any

  const adapters = createMemo(() => getAISettingServices('gaslight'))
  const [input, setInput] = createSignal<string>(props.value || '')

  const onChange = (ev: Event & { currentTarget: HTMLTextAreaElement }) => {
    setInput(ev.currentTarget.value)
  }

  createEffect(() => {
    if (!props.value) return
    setInput(props.value)
    ref.value = props.value
  })

  const onPlaceholder = (name: string) => {
    if (props.disabled) return
    const text = `{{${name}}}`
    const start = ref.selectionStart
    const end = ref.selectionEnd
    ref.setRangeText(text, ref.selectionStart, ref.selectionEnd, 'select')
    setInput(ref.value)
    setTimeout(() => ref.setSelectionRange(text.length + start, text.length + end))
    ref.focus()
  }

  const resize = () => {
    if (!ref) return

    const next = +ref.scrollHeight < 40 ? 40 : ref.scrollHeight
    ref.style.height = `${next}px`
  }

  const hide = createMemo(() => {
    if (!props.service || !adapters()) return ''
    return adapters()!.includes(props.service) ? '' : ` hidden `
  })

  onMount(resize)

  return (
    <div class={`w-full flex-col gap-2 ${hide()}`}>
      <FormLabel
        label="Prompt Template (aka gaslight)"
        helperText={
          <>
            <div>
              <span class="text-green-600">Green</span> placeholders will be inserted automatically
              if they are missing.
            </div>
            <div>
              <span class="text-yellow-600">Yellow</span> placeholders are optional and will not be
              automatically included if you do not include them.
            </div>
          </>
        }
      />
      <textarea
        id={props.fieldName}
        name={props.fieldName}
        class="form-field focusable-field text-900 min-h-[8rem] w-full rounded-xl px-4 py-2 text-sm"
        ref={ref}
        onKeyUp={onChange}
        disabled={props.disabled}
      />

      <div class="flex gap-2">
        <For each={Object.entries(placeholders).filter(([name]) => !props.exclude?.includes(name))}>
          {([name, data]) => (
            <Placeholder name={name} {...data} input={input()} onClick={onPlaceholder} />
          )}
        </For>
      </div>
    </div>
  )
}

export default PromptEditor

const Placeholder: Component<
  { name: string; input: string; onClick: (name: string) => void } & Placeholder
> = (props) => {
  const count = createMemo(() => {
    const matches = props.input.toLowerCase().match(new RegExp(`{{${props.name}}}`, 'g'))
    if (!matches) return 0
    return matches.length
  })

  const disabled = createMemo(() => count() >= props.limit)

  return (
    <div
      onClick={() => props.onClick(props.name)}
      class="bg-or cursor-pointer select-none rounded-md py-1 px-2 text-sm"
      classList={{
        'bg-green-600': props.required,
        'bg-yellow-600': !props.required && props.limit === 1,
        'bg-600': !props.required && props.limit > 1,
        'cursor-not-allowed': disabled(),
        hidden: count() >= props.limit,
      }}
    >
      {props.name}
    </div>
  )
}
