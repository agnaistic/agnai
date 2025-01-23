import { Component, For, Show, createEffect, createMemo, createSignal, on, onMount } from 'solid-js'
import { FormLabel } from '../FormLabel'
import { AIAdapter } from '/common/adapters'
import { toMap } from '../util'
import { useEffect } from '../hooks'
import { HelpCircle } from 'lucide-solid'
import { Card, Pill } from '../Card'
import Button from '../Button'
import { parseTemplate } from '/common/template-parser'
import { toBotMsg, toChar, toChat, toPersona, toProfile, toUser, toUserMsg } from '/common/dummy'
import { ensureValidTemplate, buildPromptParts } from '/common/prompt'
import { isDefaultTemplate, replaceTags } from '../../../common/presets/templates'
import TextInput from '../TextInput'
import { presetStore } from '/web/store'
import Sortable from '../Sortable'
import { SelectTemplate } from './SelectTemplate'
import { Toggle } from '/web/shared/Toggle'
import { AutoEvent, PromptSuggestions, onPromptAutoComplete, onPromptKey } from './Suggestions'
import { PresetState, SetPresetState } from '../PresetSettings/types'
import { Interp, Optionals, placeholders, v2placeholders, Placeholder } from './types'
import { DefinitionsModal } from './Definitions'

const PromptEditor: Component<
  {
    service?: AIAdapter
    fieldName?: string
    state?: PresetState
    disabled?: boolean
    value: string
    onChange: (update: { prompt?: string; templateId?: string }) => void
    showHelp?: boolean
    placeholder?: string
    minHeight?: number
    showTemplates?: boolean
    hide?: boolean

    /** Hide the meanings of "green" "yellow" "red" placeholder helper text */
    hideHelperText?: boolean

    /** Do not "inject placeholders" for the purposes of preview. Only render a preview of the provided prompt. */
    noDummyPreview?: boolean
  } & Optionals
> = (props) => {
  let ref: HTMLTextAreaElement = null as any

  const presets = presetStore()

  const [autoOpen, setAutoOpen] = createSignal(false)
  const [template, setTemplate] = createSignal('')

  const [help, showHelp] = createSignal(false)
  const [templates, setTemplates] = createSignal(false)
  const [preview, setPreview] = createSignal(false)
  const [rendered, setRendered] = createSignal('')

  const openTemplate = () => {
    setTemplates(true)
    setTemplate(ref.value)
  }

  const onTemplateKeyDown = (ev: AutoEvent) => {
    onPromptKey(ev, () => setAutoOpen(true))
  }

  const templateName = createMemo(() => {
    const id = props.state?.promptTemplateId
    if (!id) return ''
    if (isDefaultTemplate(id)) {
      return id
    }

    const template = presets.templates.find((u) => u._id === id)
    return template?.name || ''
  })

  const togglePreview = async () => {
    const opts = await getExampleOpts(props.state)
    const template = props.noDummyPreview ? props.value : ensureValidTemplate(props.value)
    let { parsed } = await parseTemplate(template, opts)

    if (props.state?.modelFormat) {
      parsed = replaceTags(parsed, props.state.modelFormat)
    }

    setRendered(parsed)
    setPreview(!preview())
  }

  const onChange = (ev: Event & { currentTarget: HTMLTextAreaElement }) => {
    resize()
    props.onChange?.({ prompt: ev.currentTarget.value, templateId: props.state?.promptTemplateId })
  }

  /**
   * Specifically for the .gaslight property only:
   * If there is a `promptTemplateId` set, we need to assign the ref.value to the template prompt
   * Otherwise use the `props.value` which is the gaslight template.
   */
  createEffect(
    on(
      () => [props.value, template(), props.state?.promptTemplateId, presets.templates],
      () => {
        if (props.state?.promptTemplateId) {
          const template = presets.templates.find((t) => t._id === props.state?.promptTemplateId)
          ref.value = template?.template || 'Loading...'
          return
        }

        ref.value = props.value
      }
    )
  )

  const usable = createMemo(() => {
    type Entry = [Interp, Placeholder]
    const all = Object.entries(placeholders) as Entry[]

    all.push(...(Object.entries(v2placeholders) as Entry[]))

    if ('include' in props === false && 'exclude' in props === false) return all

    const includes = 'include' in props ? props.include : null
    const excludes = 'exclude' in props ? props.exclude : null
    if (includes) {
      return all.filter(([name]) => includes.includes(name as Interp))
    }

    if (excludes) {
      return all.filter(([name]) => !excludes.includes(name as Interp))
    }

    return all
  })

  const onPlaceholder = (name: string, inserted: string | undefined) => {
    if (props.disabled) return
    const text = `{{${inserted || name}}}`
    const start = ref.selectionStart
    const end = ref.selectionEnd
    ref.setRangeText(text, ref.selectionStart, ref.selectionEnd, 'select')
    setTimeout(() => ref.setSelectionRange(text.length + start, text.length + end))
    ref.focus()
  }

  useEffect(() => {
    const tick = setInterval(() => {
      resize()
    }, 100)

    return () => clearInterval(tick)
  })

  const resize = () => {
    if (!ref) return
    const min = props.minHeight ?? 40

    const next = +ref.scrollHeight < min ? min : ref.scrollHeight
    ref.style.height = `${next}px`
  }

  onMount(resize)

  return (
    <div class={`relative w-full flex-col gap-2`} classList={{ hidden: props.hide ?? false }}>
      <Show when={props.showHelp}>
        <FormLabel
          label={
            <>
              <div class="mb-1 flex cursor-pointer items-center gap-2">
                Prompt Template{' '}
                <div class="link flex items-center gap-1">
                  <Pill small class="link" onClick={() => showHelp(true)}>
                    Help <HelpCircle class="ml-1" size={16} />
                  </Pill>
                </div>
              </div>
              <div class="flex gap-2">
                <Button size="sm" onClick={togglePreview}>
                  Preview
                </Button>
                <Show when={props.showTemplates}>
                  <Show when={!props.state?.promptTemplateId}>
                    <Button size="sm" onClick={openTemplate}>
                      Use Template
                    </Button>
                  </Show>

                  <Show when={!!props.state?.promptTemplateId}>
                    <Button size="sm" onClick={openTemplate}>
                      Update Template
                    </Button>
                  </Show>

                  <Button
                    size="sm"
                    onClick={() => {
                      props.onChange?.({ templateId: '', prompt: props.state?.gaslight || '' })
                    }}
                  >
                    Use Preset's Template
                  </Button>
                </Show>
              </div>
            </>
          }
          helperText={
            <Show when={!props.hideHelperText}>
              <div>
                Placeholders will{' '}
                <b>
                  <u>not</u>
                </b>{' '}
                be automatically included if you do not include them.
              </div>
            </Show>
          }
        />
      </Show>

      <Show when={preview()}>
        <pre class="whitespace-pre-wrap break-words text-sm">{rendered()}</pre>
      </Show>

      <Show when={props.fieldName === 'gaslight' && !!props.state?.promptTemplateId}>
        <TextInput readonly fieldName="promptTemplateName" value={`Template: ${templateName()}`} />
      </Show>

      <PromptSuggestions
        onComplete={(opt) => onPromptAutoComplete(ref, opt)}
        open={autoOpen()}
        close={() => setAutoOpen(false)}
        jsonValues={{ example: '', 'example with spaces': '', response: '' }}
      />
      <textarea
        class="form-field focusable-field text-900 min-h-[4rem] w-full rounded-xl px-4 py-2 font-mono text-sm"
        classList={{ hidden: preview() }}
        ref={ref}
        onKeyUp={onChange}
        disabled={props.disabled || !!props.state?.promptTemplateId}
        placeholder={props.placeholder?.replace(/\n/g, '\u000A')}
        onKeyDown={onTemplateKeyDown}
      />

      <div class="flex flex-wrap gap-2" classList={{ hidden: !!props.state?.promptTemplateId }}>
        <For each={usable()}>
          {([name, data]) => (
            <PlaceholderPill name={name} {...data} input={props.value} onClick={onPlaceholder} />
          )}
        </For>
      </div>

      <DefinitionsModal
        interps={usable().map((item) => item[0])}
        show={help()}
        close={() => showHelp(false)}
      />

      <Show when={props.showTemplates}>
        <SelectTemplate
          show={templates()}
          close={() => setTemplates(false)}
          select={(id, template) => {
            props.onChange({ templateId: id, prompt: props.value })
          }}
          currentTemplateId={props.state?.promptTemplateId}
          currentTemplate={template()}
          presetId={props.state?._id}
        />
      </Show>
    </div>
  )
}

export default PromptEditor

const BASIC_LABELS: Record<string, { label: string; id: number }> = {
  system_prompt: { label: 'System Prompt', id: 0 },
  scenario: { label: 'Scenario', id: 100 },
  personality: { label: 'Personality', id: 200 },
  impersonating: { label: 'Impersonate Personality', id: 300 },
  chat_embed: { label: 'Long-term Memory', id: 350 },
  memory: { label: 'Memory', id: 400 },
  example_dialogue: { label: 'Example Dialogue', id: 500 },
  history: { label: 'Chat History', id: 600 },
  ujb: { label: 'Jailbreak (UJB)', id: 700 },
}

const SORTED_LABELS = Object.entries(BASIC_LABELS)
  .map(([value, spec]) => ({ id: spec.id, label: spec.label, value: value }))
  .sort((l, r) => l.id - r.id)

export const BasicPromptTemplate: Component<{
  state: PresetState
  setter: SetPresetState
  hide?: boolean
}> = (props) => {
  const isMobile = createMemo(() => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent))
  const [lockPromptOrder, setLockPromptOrder] = createSignal(isMobile())
  const items = createMemo(
    () =>
      props.state?.promptOrder?.map((o) => ({
        ...BASIC_LABELS[o.placeholder],
        value: o.placeholder,
        enabled: !!o.enabled,
      })) || SORTED_LABELS.map((h) => ({ ...h, enabled: true }))
  )

  return (
    <Card border hide={props.hide}>
      <div class="flex flex-col gap-1">
        <FormLabel
          label="Prompt Order"
          helperMarkdown="Ordering of elements within your prompt. Click on an element to exclude it.
          Enable **Advanced Prompting** for full control and customization."
        />
        <div class="flex flex-wrap gap-4">
          <Toggle
            fieldName="lockPromptOrder"
            label="Lock Prompt Order"
            helperMarkdown="Prevent reordering of prompt elements. Useful for mobile devices."
            value={lockPromptOrder()}
            onChange={setLockPromptOrder}
          />
        </div>
        <Sortable
          items={items()}
          onChange={(next) =>
            props.setter(
              'promptOrder',
              next.map((n) => ({ placeholder: n.value as string, enabled: !!n.enabled }))
            )
          }
          disabled={lockPromptOrder()}
        />
      </div>
    </Card>
  )
}

const PlaceholderPill: Component<
  {
    name: Interp
    input: string
    onClick: (name: string, inserted: string | undefined) => void
  } & Placeholder
> = (props) => {
  const count = createMemo(() => {
    const matches = props.input.toLowerCase().match(new RegExp(`{{${props.name}}}`, 'g'))
    if (!matches) return 0
    return matches.length
  })

  const disabled = createMemo(() => count() >= props.limit)

  return (
    <div
      onClick={() => props.onClick(props.name, props.inserted)}
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

async function getExampleOpts(inherit?: PresetState) {
  const char = toChar('Rory', {
    scenario: 'Rory is strolling in the park',
    persona: toPersona('Rory is very talkative.'),
  })
  const replyAs = toChar('Robot', { persona: toPersona('Robot likes coffee') })
  const profile = toProfile('Author')
  const { user } = toUser('Author')
  const chat = toChat(char)

  const characters = toMap([char, replyAs])
  const history = [
    toBotMsg(char, 'Hi, nice to meet you!'),
    toUserMsg(profile, 'Nice to meet you too.'),
    toBotMsg(replyAs, 'I am also here.'),
    toUserMsg(profile, `I'm glad you're here.`),
  ]

  const lines = history.map((hist) => {
    const name = hist.characterId ? characters[hist.characterId].name : profile.handle
    return `${name}: ${hist.msg}`
  })

  const parts = await buildPromptParts(
    {
      char,
      characters,
      chat,
      members: [profile],
      replyAs,
      user,
      sender: profile,
      kind: 'send',
      chatEmbeds: [],
      userEmbeds: [],
      settings: inherit,
      resolvedScenario: char.scenario,
    },
    lines,
    (text: string) => text.length
  )

  return {
    char,
    replyAs,
    sender: profile,
    characters,
    chat,
    lines,
    parts,
    jsonValues: {},
  }
}
