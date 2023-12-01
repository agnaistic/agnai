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
import { FormLabel } from '../FormLabel'
import { AIAdapter, PresetAISettings } from '/common/adapters'
import { getAISettingServices, toMap } from '../util'
import { useEffect, useRootModal } from '../hooks'
import Modal from '../Modal'
import { HelpCircle, RefreshCcw } from 'lucide-solid'
import { Card, TitleCard } from '../Card'
import Button from '../Button'
import { parseTemplate } from '/common/template-parser'
import { toBotMsg, toChar, toChat, toPersona, toProfile, toUser, toUserMsg } from '/common/dummy'
import { ensureValidTemplate, buildPromptParts } from '/common/prompt'
import { AppSchema } from '/common/types/schema'
import { v4 } from 'uuid'
import { isDefaultTemplate, templates } from '../../../common/presets/templates'
import Select from '../Select'
import TextInput from '../TextInput'
import { presetStore, toastStore } from '/web/store'
import Sortable from '../Sortable'

type Placeholder = {
  required: boolean
  limit: number
  inserted?: string
}

type Interp = keyof typeof placeholders
type InterpV2 = keyof typeof v2placeholders
type InterpAll = Interp | InterpV2

const placeholders = {
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
  impersonating: { required: false, limit: 1 },
  longterm_memory: { required: false, limit: 1 },
  user_embed: { required: false, limit: 1 },
} satisfies Record<string, Placeholder>

const v2placeholders = {
  roll: { required: false, limit: Infinity, inserted: 'roll 20' },
  random: { required: false, limit: Infinity, inserted: 'random: a,b,c' },
  'each message': { required: false, limit: 1, inserted: `#each msg}} {{/each` },
  'each bot': { required: false, limit: 1, inserted: `#each bot}} {{/each` },
} satisfies Record<string, Placeholder>

const helpers: { [key in InterpAll]?: JSX.Element | string } = {
  char: 'Character name',
  user: `Your character's or profile name`,

  system_prompt: `(For instruct models like Turbo, GPT-4, Claude, etc). "Instructions" for how the AI should behave. E.g. "Enter roleplay mode. You will write the {{char}}'s next reply ..."`,
  ujb: '(Aka: `{{jailbreak}}`) Similar to `system_prompt`, but typically at the bottom of the prompt',

  impersonating: `Your character's personality. This only applies when you are using the "character impersonation" feature.`,
  chat_age: `The age of your chat (time elapsed since chat created)`,
  idle_duration: `The time elapsed since you last sent a message`,
  all_personalities: `Personalities of all characters in the chat EXCEPT the main character.`,
  post: 'The "post-amble" text. This gives specific instructions on how the model should respond. E.g. Typically reads: `{{char}}:`',

  longterm_memory:
    '(Aka `chat_embed`) Text retrieved from chat history embeddings. Adjust the token budget in the preset `Memory` section.',
  user_embed: 'Text retrieved from user-specified embeddings (Articles, PDFs, ...)',
  roll: 'Produces a random number. Defaults to "d20". To use a custom number: {{roll [number]}}. E.g.: {{roll 1000}}',
  random:
    'Produces a random word from a comma-separated list. E.g.: `{{random happy, sad, jealous, angry}}`',
  'each bot': (
    <>
      Suported properties: <code>{`{{.name}} {{.persona}}`}</code>
      <br />
      Example: <code>{`{{#each bot}}{{.name}}'s personality: {{.persona}}{{/each}}`}</code>
    </>
  ),
  'each message': (
    <>
      {' '}
      Supported properties: <code>{`{{.msg}} {{.name}} {{.isuser}} {{.isbot}} {{.i}}`}</code> <br />
      You can use <b>conditions</b> for isbot and isuser. E.g.{' '}
      <code>{`{{#if .isuser}} ... {{/if}}`}</code>
      <br />
      Full example:{' '}
      <code>{`{{#each msg}}{{#if .isuser}}User: {{.msg}}{{/if}}{{#if .isbot}}Bot: {{.msg}}{{/if}}{{/each}}`}</code>
    </>
  ),
}

type Optionals = { exclude: InterpAll[] } | { include: InterpAll[] } | {}

const PromptEditor: Component<
  {
    fieldName: string
    service?: AIAdapter
    inherit?: Partial<AppSchema.GenSettings>
    disabled?: boolean
    value?: string
    onChange?: (value: string) => void
    aiSetting?: keyof PresetAISettings
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

  const adapters = createMemo(() => getAISettingServices(props.aiSetting || 'gaslight'))
  const userTemplates = presetStore((s) => s.templates)
  const [input, setInput] = createSignal<string>(props.value || '')
  const [templateId, setTemplateId] = createSignal(props.inherit?.promptTemplateId || '')
  const [help, showHelp] = createSignal(false)
  const [templates, setTemplates] = createSignal(false)
  const [preview, setPreview] = createSignal(false)
  const [rendered, setRendered] = createSignal('')

  const templateName = createMemo(() => {
    const id = templateId()
    if (!id) return ''
    if (isDefaultTemplate(id)) {
      return id
    }

    const template = userTemplates.find((u) => u._id === id)
    return template?.name || ''
  })

  createEffect(async () => {
    const opts = await getExampleOpts(props.inherit)
    const template = props.noDummyPreview ? input() : ensureValidTemplate(input(), opts.parts)
    const { parsed } = await parseTemplate(template, opts)
    setRendered(parsed)
  })

  const onChange = (ev: Event & { currentTarget: HTMLTextAreaElement }) => {
    setInput(ev.currentTarget.value)
    resize()
    props.onChange?.(ev.currentTarget.value)
  }

  createEffect(() => {
    if (!props.value) return
    setInput(props.value)
    ref.value = props.value
  })

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
    setInput(ref.value)
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

  const hide = createMemo(() => {
    if (props.hide) return 'hidden'
    if (!props.service || !adapters()) return ''
    return adapters()!.includes(props.service) ? '' : `hidden `
  })

  onMount(resize)

  return (
    <div class={`w-full flex-col gap-2 ${hide()}`}>
      <Show when={props.showHelp}>
        <FormLabel
          label={
            <>
              <div class="flex cursor-pointer items-center gap-2" onClick={() => showHelp(true)}>
                Prompt Template{' '}
                <div class="link flex items-center gap-1">
                  <span class="link">Help</span>
                  <HelpCircle size={14} />
                </div>
              </div>
              <div class="flex gap-2">
                <Button size="sm" onClick={() => setPreview(!preview())}>
                  Toggle Preview
                </Button>
                <Show when={props.showTemplates}>
                  <Show when={!props.inherit?.promptTemplateId}>
                    <Button size="sm" onClick={() => setTemplates(true)}>
                      Use Library Template
                    </Button>
                  </Show>

                  <Show when={!!props.inherit?.promptTemplateId}>
                    <Button size="sm" onClick={() => setTemplates(true)}>
                      Update Library Template
                    </Button>
                  </Show>

                  <Button
                    size="sm"
                    onClick={() => {
                      setTemplateId('')
                      ref.value = props.inherit?.gaslight || ''
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
        <pre class="whitespace-pre-wrap break-words text-xs">{rendered()}</pre>
      </Show>

      <Show when={props.fieldName === 'gaslight'}>
        <TextInput readonly fieldName="promptTemplateName" value={`Template: ${templateName()}`} />
        <TextInput fieldName="promptTemplateId" value={templateId()} parentClass="hidden" />
      </Show>

      <textarea
        id={props.fieldName}
        name={props.fieldName}
        class="form-field focusable-field text-900 min-h-[4rem] w-full rounded-xl px-4 py-2 text-sm"
        classList={{ hidden: preview() }}
        ref={ref}
        onKeyUp={onChange}
        disabled={props.disabled || !!templateId()}
        placeholder={props.placeholder?.replace(/\n/g, '\u000A')}
      />

      <div class="flex flex-wrap gap-2" classList={{ hidden: !!templateId() }}>
        <For each={usable()}>
          {([name, data]) => (
            <Placeholder name={name} {...data} input={input()} onClick={onPlaceholder} />
          )}
        </For>
      </div>

      <HelpModal
        interps={usable().map((item) => item[0])}
        show={help()}
        close={() => showHelp(false)}
      />

      <Show when={props.showTemplates}>
        <SelectTemplate
          show={templates()}
          close={() => setTemplates(false)}
          select={(id, template) => {
            setTemplateId(id)
            ref.value = template
          }}
          currentTemplate={templateId()}
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
  inherit?: Partial<AppSchema.GenSettings>
  hide?: boolean
}> = (props) => {
  const items = ['Alpaca', 'Vicuna', 'Metharme', 'ChatML', 'Pyg/Simple'].map((label) => ({
    label: `Format: ${label}`,
    value: label,
  }))

  const [original, setOrder] = createSignal(
    props.inherit?.promptOrder?.map((o) => ({
      ...BASIC_LABELS[o.placeholder],
      value: o.placeholder,
      enabled: o.enabled,
    })) || SORTED_LABELS.map((h) => ({ ...h, enabled: true }))
  )
  const [mod, setMod] = createSignal(original())

  const updateOrder = (ev: number[]) => {
    const order = ev.reduce((prev, curr, i) => {
      prev.set(curr, i)
      return prev
    }, new Map<number, number>())

    const next = original()
      .slice()
      .sort((left, right) => order.get(left.id)! - order.get(right.id)!)

    setMod(next)
  }

  const onClick = (id: number) => {
    const next = original().map((o) => {
      if (o.id !== id) return o
      return { ...o, enabled: !o.enabled }
    })
    setOrder(next)
  }

  return (
    <Card border hide={props.hide}>
      <div class="flex flex-col gap-1">
        <FormLabel
          label="Prompt Order"
          helperMarkdown="Ordering of elements within your prompt. Click on an element to exclude it.
          Enable **Advanced Prompting** for full control and customization."
        />
        <Select
          fieldName="promptOrderFormat"
          items={items}
          value={props.inherit?.promptOrderFormat || 'Alpaca'}
        />
        <Sortable
          items={original()}
          onChange={updateOrder}
          onItemClick={onClick}
          enabled={original()
            .filter((o) => o.enabled)
            .map((o) => o.id)}
        />
        <TextInput
          fieldName="promptOrder"
          parentClass="hidden"
          value={mod()
            .map((o) => `${o.value}=${o.enabled ? 'on' : 'off'}`)
            .join(',')}
        />
      </div>
    </Card>
  )
}

const Placeholder: Component<
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
const builtinTemplates = Object.keys(templates).map((key) => ({
  label: `(Built-in) ${key}`,
  value: key,
}))

const SelectTemplate: Component<{
  show: boolean
  close: () => void
  select: (id: string, template: string) => void
  currentTemplate: string | undefined
}> = (props) => {
  const state = presetStore((s) => ({ templates: s.templates }))

  const [opt, setOpt] = createSignal(props.currentTemplate || 'Alpaca')
  const [template, setTemplate] = createSignal(templates.Alpaca)
  const [original, setOriginal] = createSignal(templates.Alpaca)
  const [filter, setFilter] = createSignal('')

  const templateOpts = createMemo(() => {
    const base = Object.entries(templates).reduce(
      (prev, [id, template]) => Object.assign(prev, { [id]: { name: id, template, user: false } }),
      {} as Record<string, { name: string; template: string; user: boolean }>
    )

    const all = state.templates.reduce(
      (prev, temp) =>
        Object.assign(prev, {
          [temp._id]: { name: temp.name, template: temp.template, user: true },
        }),
      base
    )

    return all
  })

  const options = createMemo(() => {
    return Object.entries(templateOpts()).map(([id, temp]) => ({
      label: temp.user ? temp.name : `(Built-in) ${temp.name}`,
      value: id,
    }))
  })

  const canSaveTemplate = createMemo(() => {
    if (opt() in templates === true) return false
    return original() !== template()
  })

  createEffect<number>((prev) => {
    const opts = options()
    if (prev !== opts.length) {
      const id = props.currentTemplate || state.templates[0]._id
      const template = state.templates.find((t) => t._id === id)
      if (!template) return opts.length

      setOpt(id)
      setTemplate(template.template)
      setOriginal(template.template)
    }

    return opts.length
  }, builtinTemplates.length)

  const Footer = (
    <>
      <Button schema="secondary" onClick={props.close}>
        Cancel
      </Button>
      <Show when={canSaveTemplate()}>
        <Button
          onClick={() => {
            const id = opt()
            const orig = state.templates.find((t) => t._id === id)
            const update = template()
            if (!orig) {
              toastStore.error(`Cannot find template to save`)
              return
            }

            presetStore.updateTemplate(opt(), { name: orig.name, template: update }, () => {
              toastStore.success('Prompt template updated')
              props.select(id, update)
              props.close()
            })
          }}
        >
          Save and Use
        </Button>
      </Show>

      <Show when={!canSaveTemplate()}>
        <Button
          schema="primary"
          onClick={() => {
            props.select(opt(), template())
            props.close()
          }}
        >
          Use
        </Button>
      </Show>
    </>
  )

  useRootModal({
    id: 'predefined-prompt-templates',
    element: (
      <Modal
        title={'Prompt Templates'}
        show={props.show}
        close={props.close}
        footer={Footer}
        maxWidth="half"
      >
        <div class="flex flex-col gap-4 text-sm">
          <div class="flex gap-1">
            <b>Id: {props.currentTemplate}</b>
            <b>Opt: {opt()}</b>
            <TextInput
              fieldName="filter"
              placeholder="Filter templates"
              onInput={(ev) => setFilter(ev.currentTarget.value)}
              parentClass="w-full"
            />
            <Button>
              <RefreshCcw onClick={presetStore.getTemplates} />
            </Button>
          </div>
          <div class="h-min-[6rem]">
            <Select
              fieldName="templateId"
              items={options().filter((opt) => opt.label.toLowerCase().includes(filter()))}
              value={opt()}
              onChange={(ev) => {
                setOpt(ev.value)
                setTemplate(templateOpts()[ev.value].template)
                setOriginal(templateOpts()[ev.value].template)
              }}
            />
          </div>
          <TextInput
            fieldName="template"
            value={template()}
            isMultiline
            onInput={(ev) => setTemplate(ev.currentTarget.value)}
          />
        </div>
        <div class="flex justify-end gap-2"></div>
      </Modal>
    ),
  })

  return null
}

const HelpModal: Component<{
  show: boolean
  close: () => void
  interps: Interp[]
  inherit?: Partial<AppSchema.GenSettings>
}> = (props) => {
  const [id] = createSignal(v4())
  const items = createMemo(() => {
    const all = Object.entries(helpers)
    const entries = all.filter(([interp]) => props.interps.includes(interp as any))

    return entries
  })

  useRootModal({
    id: `prompt-editor-help-${id()}`,
    element: (
      <Modal
        show={props.show}
        close={props.close}
        title={<div>Placeholder Definitions</div>}
        maxWidth="half"
      >
        <div class="flex w-full flex-col gap-1 text-sm">
          <For each={items()}>
            {([interp, help]) => (
              <TitleCard>
                <Switch>
                  <Match when={typeof help === 'string'}>
                    <FormLabel label={<b>{interp}</b>} helperMarkdown={help as string} />
                  </Match>
                  <Match when>
                    <FormLabel label={<b>{interp}</b>} helperText={help} />
                  </Match>
                </Switch>
              </TitleCard>
            )}
          </For>
        </div>
      </Modal>
    ),
  })

  return null
}

async function getExampleOpts(inherit?: Partial<AppSchema.GenSettings>) {
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
  }
}
