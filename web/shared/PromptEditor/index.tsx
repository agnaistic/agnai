import { Component, For, Show, createEffect, createMemo, createSignal, onMount } from 'solid-js'
import { FormLabel } from '../FormLabel'
import { AIAdapter, PresetAISettings } from '/common/adapters'
import { getAISettingServices } from '../util'

type Placeholder = {
  required: boolean
  limit: number
}

const placeholders: Record<string, Placeholder> = {
  char: { required: false, limit: Infinity },
  user: { required: false, limit: Infinity },
  chat_age: { required: false, limit: Infinity },
  idle_duration: { required: false, limit: Infinity },
  system_prompt: { required: false, limit: 1 },
  history: { required: true, limit: 1 },
  scenario: { required: true, limit: 1 },
  memory: { required: false, limit: 1 },
  personality: { required: true, limit: 1 },
  ujb: { required: false, limit: 1 },
  post: { required: true, limit: 1 },
  example_dialogue: { required: true, limit: 1 },
  all_personalities: { required: false, limit: 1 },
} satisfies Record<string, Placeholder>

type HolderName = keyof typeof placeholders

type Optionals = { exclude: HolderName[] } | { include: HolderName[] } | {}

const PromptEditor: Component<
  {
    fieldName: string
    service?: AIAdapter
    disabled?: boolean
    value?: string
    onChange?: (value: string) => void
    aiSetting?: keyof PresetAISettings
    showHelp?: boolean
    placeholder?: string
  } & Optionals
> = (props) => {
  let ref: HTMLTextAreaElement = null as any

  const adapters = createMemo(() => getAISettingServices(props.aiSetting || 'gaslight'))
  const [input, setInput] = createSignal<string>(props.value || '')

  const onChange = (ev: Event & { currentTarget: HTMLTextAreaElement }) => {
    setInput(ev.currentTarget.value)
  }

  createEffect(() => {
    if (!props.value) return
    setInput(props.value)
    ref.value = props.value
  })

  const usableHolders = createMemo(() => {
    const all = Object.entries(placeholders)

    if ('include' in props === false && 'exclude' in props === false) return all

    const includes = 'include' in props ? props.include : null
    const excludes = 'exclude' in props ? props.exclude : null
    if (includes) {
      return all.filter(([name]) => includes.includes(name))
    }

    if (excludes) {
      return all.filter(([name]) => !excludes.includes(name))
    }

    return all
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
      <Show when={props.showHelp}>
        <FormLabel
          label="Prompt Template (formerly gaslight)"
          helperText={
            <>
              <div>
                <span class="text-green-600">Green</span> placeholders will be inserted
                automatically if they are missing.
              </div>
              <div>
                <span class="text-yellow-600">Yellow</span> placeholders will not be automatically
                included if you do not include them.
              </div>
              <div>
                <span class="text-red-600">example_dialogue</span> will be inserted as conversation
                history if you do not include it. It is recommended to NOT include example_dialogue.
              </div>
            </>
          }
        />
      </Show>

      <textarea
        id={props.fieldName}
        name={props.fieldName}
        class="form-field focusable-field text-900 min-h-[8rem] w-full rounded-xl px-4 py-2 text-sm"
        ref={ref}
        onKeyUp={onChange}
        disabled={props.disabled}
        placeholder={props.placeholder}
      />

      <div class="flex flex-wrap gap-2">
        <For each={usableHolders()}>
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
      class="cursor-pointer select-none rounded-md px-2 py-1 text-sm"
      classList={{
        'bg-red-600': props.name === 'example_dialogue',
        'bg-green-600': props.required && props.name !== 'example_dialogue',
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
