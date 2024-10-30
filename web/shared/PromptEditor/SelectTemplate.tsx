import { Component, Match, Switch, createEffect, createMemo, createSignal } from 'solid-js'
import { RootModal } from '../Modal'
import { RefreshCcw } from 'lucide-solid'
import Button from '../Button'
import { templates } from '../../../common/presets/templates'
import Select from '../Select'
import TextInput from '../TextInput'
import { presetStore, toastStore } from '/web/store'
import { PromptSuggestions, onPromptAutoComplete, onPromptKey } from './Suggestions'

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
  presetId: string | undefined
}> = (props) => {
  let ref: HTMLTextAreaElement
  const state = presetStore((s) => ({ templates: s.templates }))

  const [opt, setOpt] = createSignal(props.currentTemplateId || 'Alpaca')
  const [templateName, setName] = createSignal(props.currentTemplate || 'Alpaca')
  const [template, setTemplate] = createSignal(templates.Alpaca)
  const [builtin, setBuiltin] = createSignal(templates.Alpaca)
  const [filter, setFilter] = createSignal('')
  const [autoOpen, setAutoOpen] = createSignal(false)

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
    if (opt() in templates === true) return false
    return true
  })

  createEffect<number>((prev) => {
    const opts = options()
    if (!props.show) return -1

    if (prev !== opts.length) {
      const id = props.currentTemplateId || state.templates[0]?._id
      const match = opts.find((o) => o.value === id)

      if (!match) return opts.length

      setOpt(id)
      const existing = state.templates.find((t) => t._id === id)
      setName(existing?.name || '')
      setTemplate(existing?.template || props.currentTemplate || match.template)
      setBuiltin(match.template)
    }

    return opts.length
  }, builtinTemplates.length)

  const Footer = (
    <>
      <Button schema="secondary" onClick={props.close}>
        Cancel
      </Button>
      <Switch>
        <Match when={canSaveTemplate() && !!props.presetId}>
          <Button
            onClick={() => {
              const id = opt()
              const orig = state.templates.find((t) => t._id === id)
              const update = template()
              if (!orig) {
                toastStore.error(`Cannot find template to save`)
                return
              }

              presetStore.updateTemplate(
                opt(),
                { name: templateName(), template: update, presetId: props.presetId },
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

        <Match when={canSaveTemplate() && !props.presetId}>
          <Button
            onClick={() => {
              const id = opt()
              const orig = state.templates.find((t) => t._id === id)
              const update = template()
              if (!orig) {
                toastStore.error(`Cannot find template to save`)
                return
              }

              presetStore.updateTemplate(opt(), { name: templateName(), template: update }, () => {
                toastStore.success('Prompt template updated')
                props.select(id, update)
                props.close()
              })
            }}
          >
            Save and Use
          </Button>
        </Match>

        <Match when={template() !== builtin()}>
          <Button
            schema="primary"
            onClick={() => {
              presetStore.createTemplate(templateName(), template(), props.presetId, (id) => {
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
              props.select(opt(), template())
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
    <RootModal
      title={'Prompt Templates'}
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

              const matches = state.templates.filter((t) => t.name.startsWith(`Custom ${opt()}`))
              const name = ev.label.startsWith('(Built-in)')
                ? matches.length > 0
                  ? `Custom ${opt()} #${matches.length + 1}`
                  : `Custom ${opt()}`
                : templateOpts()[ev.value].name
              if (ev.label.startsWith('(Built-in)')) {
              }

              setName(name)
              setTemplate(templateOpts()[ev.value].template)
            }}
          />
        </div>
        <PromptSuggestions
          onComplete={(opt) => onPromptAutoComplete(ref, opt)}
          open={autoOpen()}
          close={() => setAutoOpen(false)}
          jsonValues={{ example: '', 'another long example': '', response: '' }}
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
  )
}
