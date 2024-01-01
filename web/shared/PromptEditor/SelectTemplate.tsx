import { Component, Match, Switch, createEffect, createMemo, createSignal } from 'solid-js'
import { useRootModal } from '../hooks'
import Modal from '../Modal'
import { RefreshCcw } from 'lucide-solid'
import Button from '../Button'
import { templates } from '../../../common/presets/templates'
import Select from '../Select'
import TextInput from '../TextInput'
import { presetStore, toastStore } from '/web/store'

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
}> = (props) => {
  const state = presetStore((s) => ({ templates: s.templates }))

  const [opt, setOpt] = createSignal(props.currentTemplateId || 'Alpaca')
  const [template, setTemplate] = createSignal(templates.Alpaca)
  const [builtin, setBuiltin] = createSignal(templates.Alpaca)
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
      const id = props.currentTemplateId || state.templates[0]._id
      const match = opts.find((o) => o.value === id)

      if (!match) return opts.length

      setOpt(id)
      setTemplate(props.currentTemplate || match.template)
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
        <Match when={canSaveTemplate()}>
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
        </Match>

        <Match when={template() !== builtin()}>
          <Button
            schema="primary"
            onClick={() => {
              const matches = state.templates.filter((t) => t.name.startsWith(`Custom ${opt()}`))

              const name =
                matches.length > 0 ? `Custom ${opt()} #${matches.length + 1}` : `Custom ${opt()}`

              presetStore.createTemplate(name, template(), (id) => {
                props.select(id, template())
                props.close()
              })
            }}
          >
            Save As
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
