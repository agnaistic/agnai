import { Component, Match, Switch, createEffect, createMemo, createSignal } from 'solid-js'
import { RootModal } from '../Modal'
import { HelpCircle, Plus, RefreshCcw } from 'lucide-solid'
import Button from '../Button'
import { templates } from '../../../common/presets/templates'
import Select from '../Select'
import TextInput from '../TextInput'
import { presetStore, toastStore } from '/web/store'
import { PromptSuggestions, onPromptAutoComplete, onPromptKey } from './Suggestions'
import { DefinitionsModal } from './Definitions'
import { Interp, Placeholder, placeholders, v2placeholders } from './types'
import { Pill } from '../Card'
import { ContextPreset } from '/web/store/preset-context'
import { getJsonSchema } from '../util'

const builtinTemplates = Object.keys(templates).map((key) => ({
  label: `(Built-in) ${key}`,
  value: key,
}))

export const SelectTemplate: Component<{
  show: boolean
  close: () => void
  select: (id: string, template: string) => void
  currentTemplateId: string | undefined
  currentTemplate: string | undefined
  preset: ContextPreset | undefined
}> = (props) => {
  let ref: HTMLTextAreaElement
  const state = presetStore((s) => ({ templates: s.templates }))

  const [templateId, setTemplateId] = createSignal(props.currentTemplateId || 'Universal')
  const [templateName, setName] = createSignal(props.currentTemplate || 'Universal')
  const [template, setTemplate] = createSignal(templates.Universal)
  const [builtin, setBuiltin] = createSignal(templates.Universal)

  const [filter, setFilter] = createSignal('')
  const [autoOpen, setAutoOpen] = createSignal(false)
  const [help, showHelp] = createSignal(false)

  const suggestions = createMemo(() => {
    if (!props.preset) return []

    const schema = getJsonSchema({ preset: props.preset })
    if (!schema?.schema) return []

    const names = schema.schema.schema.reduce((prev, curr) => {
      prev.push(curr.name)
      if (curr.alias) prev.push(curr.alias)
      return prev
    }, [] as string[])

    return names
  })

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
    return Object.entries(templateOpts()).map(([id, temp]) => {
      let label = temp.user ? temp.name : `(Built-in) ${temp.name}`

      if (!temp.user && id === props.currentTemplateId && temp.template !== props.currentTemplate) {
        label = `${label} (modified)`
      }

      return {
        label,
        value: id,
        template: temp.template,
      }
    })
  })

  const canSaveTemplate = createMemo(() => {
    if (templateId() in templates === true) return false
    return true
  })

  createEffect<number>((prev) => {
    const opts = options()
    if (!props.show) return -1

    if (prev !== opts.length) {
      const id = props.currentTemplateId || state.templates[0]?._id
      const match = opts.find((o) => o.value === id)

      if (!match) return opts.length

      setTemplateId(id)
      const existing = state.templates.find((t) => t._id === id)
      setName(existing?.name || '')
      setTemplate(existing?.template || props.currentTemplate || match.template)
      setBuiltin(match.template)
    }

    return opts.length
  }, builtinTemplates.length)

  const usable = createMemo(() => {
    type Entry = [Interp, Placeholder]
    const all = Object.entries(placeholders) as Entry[]

    all.push(...(Object.entries(v2placeholders) as Entry[]))
    return all
  })

  const newTemplate = () => {
    setTemplateId('Universal')
    setName('New Template')
    setTemplate(templates.Universal)
  }

  const Footer = (
    <>
      <Button schema="secondary" onClick={props.close}>
        Cancel
      </Button>
      <Switch>
        <Match when={canSaveTemplate() && !!props.preset?._id}>
          <Button
            onClick={() => {
              const id = templateId()
              const orig = state.templates.find((t) => t._id === id)
              const update = template()
              if (!orig) {
                toastStore.error(`Cannot find template to save`)
                return
              }

              presetStore.updateTemplate(
                templateId(),
                { name: templateName(), template: update, presetId: props.preset?._id },
                () => {
                  toastStore.success('Prompt template updated')
                  props.select(id, update)
                  props.close()
                }
              )
            }}
          >
            Save and Use
          </Button>
        </Match>

        <Match when={canSaveTemplate() && !props.preset?._id}>
          <Button
            onClick={() => {
              const id = templateId()
              const orig = state.templates.find((t) => t._id === id)
              const update = template()
              if (!orig) {
                toastStore.error(`Cannot find template to save`)
                return
              }

              presetStore.updateTemplate(
                templateId(),
                { name: templateName(), template: update },
                () => {
                  toastStore.success('Prompt template updated')
                  props.select(id, update)
                  props.close()
                }
              )
            }}
          >
            Save and Use
          </Button>
        </Match>

        <Match when={templateId() in templates && template() !== builtin()}>
          <Button
            schema="primary"
            onClick={() => {
              presetStore.createTemplate(templateName(), template(), props.preset?._id, (id) => {
                props.select(id, template())
                props.close()
              })
            }}
          >
            Create and Use
          </Button>
        </Match>

        <Match when>
          <Button
            schema="primary"
            onClick={() => {
              props.select(templateId(), template())
              props.close()
            }}
          >
            Use
          </Button>
        </Match>
      </Switch>
    </>
  )

  return (
    <>
      <RootModal
        title={
          <div class="flex gap-1">
            Prompt Templates{' '}
            <Pill small onClick={() => showHelp(true)}>
              Help <HelpCircle class="ml-1" size={16} />
            </Pill>
          </div>
        }
        show={props.show}
        close={props.close}
        footer={Footer}
        maxWidth="half"
      >
        <div class="relative flex flex-col gap-4 text-sm">
          <div class="flex gap-1">
            <TextInput
              fieldName="filter"
              placeholder="Filter templates"
              onChange={(ev) => setFilter(ev.currentTarget.value)}
              parentClass="w-full"
            />
            <Button onClick={() => presetStore.getTemplates()}>
              <RefreshCcw />
            </Button>
          </div>
          <div class="h-min-[6rem] flex gap-2">
            <Select
              fieldName="templateId"
              items={options().filter((opt) =>
                opt.label.toLowerCase().includes(filter().toLowerCase())
              )}
              value={templateId()}
              onChange={(ev) => {
                setTemplateId(ev.value)

                const matches = state.templates.filter((t) =>
                  t.name.startsWith(`Custom ${ev.value}`)
                )

                const name =
                  ev.value in templates
                    ? matches.length > 0
                      ? `Custom ${templateId()} #${matches.length + 1}`
                      : `Custom ${templateId()}`
                    : templateOpts()[ev.value].name

                setName(name)
                setTemplate(templateOpts()[ev.value].template)
              }}
            />
            <Button size="sm" minHeight={36} onClick={newTemplate}>
              New <Plus />
            </Button>
          </div>
          <PromptSuggestions
            onComplete={(opt) => onPromptAutoComplete(ref, opt)}
            open={autoOpen()}
            close={() => setAutoOpen(false)}
            jsonValues={suggestions()}
          />
          <TextInput
            fieldName="templateName"
            value={templateName()}
            onChange={(ev) => setName(ev.currentTarget.value)}
          />
          <TextInput
            ref={(r) => (ref = r)}
            fieldName="template"
            value={template()}
            isMultiline
            onChange={(ev) => setTemplate(ev.currentTarget.value)}
            class="font-mono text-xs"
            onKeyDown={(ev) => onPromptKey(ev as any, () => setAutoOpen(true))}
          />
        </div>
        <div class="flex justify-end gap-2"></div>
      </RootModal>

      <DefinitionsModal
        interps={usable().map((item) => item[0])}
        show={help()}
        close={() => showHelp(false)}
      />
    </>
  )
}
