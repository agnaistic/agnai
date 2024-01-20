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
import { HelpCircle } from 'lucide-solid'
import { Card, TitleCard } from '../Card'
import Button from '../Button'
import { parseTemplate } from '/common/template-parser'
import { toBotMsg, toChar, toChat, toPersona, toProfile, toUser, toUserMsg } from '/common/dummy'
import { ensureValidTemplate, buildPromptParts } from '/common/prompt'
import { AppSchema } from '/common/types/schema'
import { v4 } from 'uuid'
import { isDefaultTemplate, replaceTags } from '../../../common/presets/templates'
import Select from '../Select'
import TextInput from '../TextInput'

import { presetStore } from '/web/store'
import Sortable, { SortItem } from '../Sortable'
import { SelectTemplate } from './SelectTemplate'
import { Trans, useTransContext } from '@mbarzda/solid-i18next'
import { TFunction } from 'i18next'


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
  insert: { required: false, limit: Infinity, inserted: `#insert 3}} {{/insert` },
  'each message': { required: false, limit: 1, inserted: `#each msg}} {{/each` },
  'each bot': { required: false, limit: 1, inserted: `#each bot}} {{/each` },
  'each chat_embed': { required: false, limit: 1, inserted: `#each chat_embed}} {{/each` },
  lowpriority: { required: false, limit: Infinity, inserted: `#lowpriority}} {{/lowpriority` },
} satisfies Record<string, Placeholder>

const helpers: (t: TFunction) => { [key in InterpAll]?: JSX.Element | string } = (
  t: TFunction
) => ({
  char: t('helpers_char'),
  user: t('helpers_user'),

  system_prompt: t('helpers_system_prompt'),
  ujb: t('helpers_ujb'),

  impersonating: t('helpers_impersonating'),
  chat_age: t('helpers_chat_age'),
  idle_duration: t('helpers_idle_duration'),
  all_personalities: t('helpers_all_personalities'),
  post: t('helpers_post_amble'),
  insert:
    "(Aka author's note) Insert text at a specific depth in the prompt. E.g. `{{#insert=4}}This is 4 rows from the bottom{{/insert}}`",
  longterm_memory: t('helpers_long_term_memory'),
  user_embed: t('helpers_user_embed'),
  roll: t('helpers_roll'),
  random: t('helpers_random'),
  'each bot': (
    <Trans key="helpers_each_bot">
      Suported properties: <code>{`{{.name}} {{.persona}}`}</code>
      Example: <code>{`{{#each bot}}{{.name}}'s personality: {{.persona}}{{/each}}`}</code>
    </Trans>
  ),
  'each message': (
    <Trans key="helpers_each_message">
      Supported properties: <code>{`{{.msg}} {{.name}} {{.isuser}} {{.isbot}} {{.i}}`}</code> <br />
      You can use <b>conditions</b> for isbot and isuser. E.g.
      <code>{`{{#if .isuser}} ... {{/if}}`}</code>
      Full example:
      <code>{`{{#each msg}}{{#if .isuser}}User: {{.msg}}{{/if}}{{#if .isbot}}Bot: {{.msg}}{{/if}}{{/each}}`}</code>
    </Trans>
  ),
  'each chat_embed': (
    <>
      Supported properties: <code>{`{{.name}} {{.text}}`}</code>
      <br />
      Example: <code>{`{{#each chat_embed}}{{.name}} said: {{.text}}{{/each}}`}</code>
    </>
  ),
  lowpriority: (
    <>
      Text that is only inserted if there still is token budget remaining for it after inserting
      conversation history.
      <br />
      Example:{' '}
      <code>{`{{#if example_dialogue}}{{#lowpriority}}This is how {{char}} speaks: {{example_dialogue}}{{/lowpriority}}{{/if}}`}</code>
    </>
  ),
}
})

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
  const [t] = useTransContext()

  let ref: HTMLTextAreaElement = null as any

  const adapters = createMemo(() => getAISettingServices(props.aiSetting || 'gaslight'))
  const presets = presetStore()
  const [input, setInput] = createSignal<string>(props.value || '')

  const [templateId, setTemplateId] = createSignal('')
  const [template, setTemplate] = createSignal('')

  const [help, showHelp] = createSignal(false)
  const [templates, setTemplates] = createSignal(false)
  const [preview, setPreview] = createSignal(false)
  const [rendered, setRendered] = createSignal('')

  const openTemplate = () => {
    if (!templateId()) {
      setTemplateId(props.inherit?.promptTemplateId || '')
    }

    setTemplates(true)
    setTemplate(ref.value)
  }

  const templateName = createMemo(() => {
    const id = templateId()
    if (!id) return ''
    if (isDefaultTemplate(id)) {
      return id
    }

    const template = presets.templates.find((u) => u._id === id)
    return template?.name || ''
  })

  const togglePreview = async () => {
    const opts = await getExampleOpts(props.inherit)
    const template = props.noDummyPreview ? input() : ensureValidTemplate(input())
    let { parsed } = await parseTemplate(template, opts)

    if (props.inherit?.modelFormat) {
      parsed = replaceTags(parsed, props.inherit.modelFormat)
    }

    setRendered(parsed)
    setPreview(!preview())
  }

  // createEffect(async () => {
  //   const opts = await getExampleOpts(props.inherit)
  //   const template = props.noDummyPreview ? input() : ensureValidTemplate(input(), opts.parts)
  //   let { parsed } = await parseTemplate(template, opts)

  //   if (props.inherit?.modelFormat) {
  //     parsed = replaceTags(parsed, props.inherit.modelFormat)
  //   }

  //   setRendered(parsed)
  // })

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
                {t('prompt_template')}
                <div class="link flex items-center gap-1">
                  <span class="link">{t('help')}</span>
                  <HelpCircle size={14} />
                </div>
              </div>
              <div class="flex gap-2">
                <Button size="sm" onClick={togglePreview}>
                  {t('toggle_preview')}
                </Button>
                <Show when={props.showTemplates}>
                  <Show when={!props.inherit?.promptTemplateId}>
                    <Button size="sm" onClick={openTemplate}>
                      {t('use_library_template')}
                    </Button>
                  </Show>

                  <Show when={!!props.inherit?.promptTemplateId}>
                    <Button size="sm" onClick={openTemplate}>
                      {t('update_library_template')}
                    </Button>
                  </Show>

                  <Button
                    size="sm"
                    onClick={() => {
                      setTemplateId('')
                      ref.value = props.inherit?.gaslight || ''
                    }}
                  >
                    {t('use_preset_template')}
                  </Button>
                </Show>
              </div>
            </>
          }
          helperText={
            <Show when={!props.hideHelperText}>
              <div>
                <Trans key="placeholders_will_not_be_automatically_included">
                  Placeholders will
                  <b>not</b>
                  be automatically included if you do not include them.
                </Trans>
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
          currentTemplateId={templateId() || props.inherit?.promptTemplateId}
          currentTemplate={template()}
        />
      </Show>
    </div>
  )
}

export default PromptEditor

const BASIC_LABELS: (t: TFunction) => Record<string, { label: string; id: number }> = (
  t: TFunction
) => ({
  system_prompt: { label: t('system_prompt'), id: 0 },
  scenario: { label: t('scenario'), id: 100 },
  personality: { label: t('personality'), id: 200 },
  impersonating: { label: t('impersonate_personality'), id: 300 },
  chat_embed: { label: t('long_term_memory'), id: 350 },
  memory: { label: t('memory'), id: 400 },
  example_dialogue: { label: t('example_dialogue'), id: 500 },
  history: { label: t('chat_history'), id: 600 },
  ujb: { label: t('jailbreak_ujb'), id: 700 },
})

const SORTED_LABELS = (t: TFunction) =>
  Object.entries(BASIC_LABELS(t))
    .map(([value, spec]) => ({ id: spec.id, label: spec.label, value: value }))
    .sort((l, r) => l.id - r.id)

export const BasicPromptTemplate: Component<{
  inherit?: Partial<AppSchema.GenSettings>
  hide?: boolean
}> = (props) => {

  let ref: HTMLInputElement

  const [t] = useTransContext()

  const items = [t('alpaca'), t('vicuna'), t('metharme'), t('chat_ml'), t('pyg_simple')].map(
    (label) => ({
      label: t('format_x', { name: label }),
      value: label,
    })
  )


  const [mod, setMod] = createSignal(
    props.inherit?.promptOrder?.map((o) => ({
      ...BASIC_LABELS(t)[o.placeholder],
      value: o.placeholder,
      enabled: o.enabled,
    })) || SORTED_LABELS(t).map((h) => ({ ...h, enabled: true }))
  )

  const updateRef = (items: SortItem[]) => {
    ref.value = items.map((n) => `${n.value}=${n.enabled ? 'on' : 'off'}`).join(',')
  }

  const onClick = (id: number) => {
    const prev = mod()
    const next = prev.map((o) => {
      if (o.id !== id) return o
      return { ...o, enabled: !o.enabled }
    })
    setMod(next)
    updateRef(next)
  }

  onMount(() => {
    updateRef(mod())
  })

  return (
    <Card border hide={props.hide}>
      <div class="flex flex-col gap-1">
        <FormLabel label={t('prompt_order')} helperMarkdown={t('prompt_order_message')} />
        <Select
          fieldName="promptOrderFormat"
          items={items}
          value={props.inherit?.promptOrderFormat || t('alpaca')}
        />
        <Sortable items={mod()} onChange={updateRef} onItemClick={onClick} />
        <TextInput
          fieldName="promptOrder"
          parentClass="hidden"
          ref={(ele) => (ref = ele)}
          // value={''}
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

async function getExampleOpts(t: TFunction, inherit?: Partial<AppSchema.GenSettings>) {
  const char = toChar(t('example_char_name'), {
    scenario: t('example_scenario'),
    persona: toPersona(t('example_persona')),
  })
  const replyAs = toChar(t('example_bot_name'), { persona: toPersona(t('example_bot_persona')) })
  const profile = toProfile(t('example_author'))
  const { user } = toUser(t('example_author'))
  const chat = toChat(char)

  const characters = toMap([char, replyAs])
  const history = [
    toBotMsg(char, t('example_message_1')),
    toUserMsg(profile, t('example_message_2')),
    toBotMsg(replyAs, t('example_message_3')),
    toUserMsg(profile, t('example_message_4')),
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
