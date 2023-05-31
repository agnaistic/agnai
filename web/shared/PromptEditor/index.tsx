import { Component, For, createEffect, createMemo, createSignal, onMount } from 'solid-js'
import { AppSchema } from '/srv/db/schema'

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
  message: { required: true, limit: 1 },
  example_dialogue: { required: false, limit: 1 },
}

const PromptEditor: Component<{ preset?: Partial<AppSchema.UserGenPreset> }> = (props) => {
  let ref: HTMLTextAreaElement = null as any

  const [input, setInput] = createSignal<string>(props.preset?.gaslight || '')

  const onChange = (ev: Event & { currentTarget: HTMLTextAreaElement }) => {
    setInput(ev.currentTarget.value)
  }

  createEffect(() => {
    if (!props.preset?.gaslight) return
    setInput(props.preset.gaslight)
    ref.value = props.preset.gaslight
  })

  const onPlaceholder = (name: string) => {
    const text = `{{${name}}}`
    const start = ref.selectionStart
    const end = ref.selectionEnd
    ref.setRangeText(text, ref.selectionStart, ref.selectionEnd, 'select')
    setInput(ref.value)
    setTimeout(() => ref.setSelectionRange(text.length + start, text.length + end))
  }

  const resize = () => {
    if (!ref) return

    const next = +ref.scrollHeight < 40 ? 40 : ref.scrollHeight
    ref.style.height = `${next}px`
  }

  onMount(resize)

  return (
    <div class="w-full flex-col gap-2">
      <textarea
        class="form-field focusable-field text-900 min-h-[8rem] w-full rounded-xl px-4 py-2 text-sm"
        ref={ref}
        onKeyUp={onChange}
      />
      <div class="flex gap-2">
        <For each={Object.entries(placeholders)}>
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
      class="cursor-pointer select-none rounded-md py-1 px-2 text-sm"
      classList={{
        'bg-green-500': props.required,
        'bg-gray-400': !props.required,
        'cursor-not-allowed': disabled(),
        hidden: count() >= props.limit,
      }}
    >
      {props.name}
    </div>
  )
}
