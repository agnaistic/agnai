import { Component, For, Index, Match, Show, Switch, createEffect, createMemo, on } from 'solid-js'
import TextInput from '/web/shared/TextInput'
import Convertible from '../../Chat/Convertible'
import Button from '/web/shared/Button'
import { createStore } from 'solid-js/store'
import { gameStore } from './state'
import { parseTemplateV2 } from '/common/guidance/v2'
import { GuidedField, GuidedSession } from '/web/store/data/guided'
import Select, { Option } from '/web/shared/Select'
import TagInput from '/web/shared/TagInput'

export const GamePane: Component = (props) => {
  const state = gameStore((g) => ({ list: g.templates, template: g.template, state: g.state }))
  const [over, setOver] = createStore<Record<string, string>>(state.state.overrides || {})

  const templateId = createMemo<string>((prev) => {
    return state.template._id
  })

  createEffect((id) => {
    if (state.state._id === id) return
    setOver(state.state.overrides)
    return state.state._id
  }, state.state._id)

  const lists = createMemo(() => {
    const list = Object.entries(state.template.lists)
      .map(([name, options]) => ({ name, options }))
      .filter((entry) => {
        const visible = state.template.fields.some((f) => f.visible && f.list === entry.name)
        return visible
      })
    return list
  })

  const items = createMemo<Option[]>((prev) => {
    const next = state.list.map((t) => ({ label: t.name, value: t._id }))
    // if (prev?.length === next.length) return prev
    return next
  })

  const updateOver = (field: string, value: string) => {
    const next = { ...over, [field]: value }
    setOver(next)
    gameStore.update({ overrides: next })
  }

  const diff = createMemo(() => {
    return state.template.init + state.template.loop
  })

  const [store, setState] = createStore({
    errors: [] as string[],
    seen: {} as Record<string, boolean>,
  })

  createEffect(
    on(diff, () => {
      const fields = state.template.fields.slice()
      const lists = { ...state.template.lists }
      const seen: Record<string, boolean> = {}
      const errors: string[] = []

      try {
        const initAst = parseTemplateV2(state.template.init)
        for (const node of initAst) {
          if (node.kind !== 'variable') continue

          seen[node.name] = true
          const exists = fields.some((n) => n.name === node.name)

          if (exists) continue
          const listName = node.options
          fields.push({
            name: node.name,
            type: node.type === 'options' || node.type === 'random' ? 'string' : node.type,
            visible: false,
            label: '',
            list: listName,
          })

          if (listName && listName in lists === false) {
            lists[listName] = []
          }
        }
      } catch (ex: any) {
        errors.push('Init:', ex.message)
      }

      try {
        const loopAst = parseTemplateV2(state.template.loop || ' ')
        for (const node of loopAst) {
          if (node.kind !== 'variable') continue
          seen[node.name] = true
          const exists = fields.some((n) => n.name === node.name)
          if (exists) continue

          const listName = node.options
          fields.push({
            name: node.name,
            type: node.type === 'options' || node.type === 'random' ? 'string' : node.type,
            visible: false,
            label: '',
            list: listName,
          })

          if (listName && listName in lists === false) {
            lists[listName] = []
          }
        }
      } catch (ex: any) {
        errors.push('Loop:', ex.message)
      }

      const next = fields.map((field) => (seen[field.name] ? field : { ...field, visible: false }))

      setState({ errors, seen })
      gameStore.updateTemplate({ fields: next, lists })
    })
  )

  const updateName: FormHandler = (ev) => gameStore.updateTemplate({ name: ev.currentTarget.value })
  const updateInit: FormHandler = (ev) => gameStore.updateTemplate({ init: ev.currentTarget.value })
  const updateLoop: FormHandler = (ev) => gameStore.updateTemplate({ loop: ev.currentTarget.value })
  const updateList = (name: string, items: string[]) => {
    const next = { ...state.template.lists }
    next[name] = items
    gameStore.updateTemplate({ lists: next })
  }

  const updateHistory: FormHandler = (ev) =>
    gameStore.updateTemplate({ history: ev.currentTarget.value })

  const onFieldChange = (name: string) => (next: Partial<GuidedField>) => {
    const fields = state.template.fields.map((prev) =>
      prev.name === name ? { ...prev, ...next } : prev
    )
    gameStore.updateTemplate({ fields })
  }

  return (
    <Convertible kind="partial" close={() => gameStore.setState({ pane: undefined })}>
      <div class="flex flex-col gap-4">
        <div class="flex gap-1">
          <Show when={state.list.length > 0}>
            <Select
              fieldName="templateId"
              items={items()}
              value={templateId()}
              onChange={(ev) => gameStore.loadTemplate(ev.value)}
            />
          </Show>
          <Button onClick={gameStore.createTemplate}>New</Button>
          <Button onClick={gameStore.saveTemplate}>Save</Button>
          <Show when={state.template._id !== ''}>
            <Button onClick={gameStore.saveTemplateCopy}>Copy</Button>
          </Show>
        </div>
        <div>{state.template._id || 'New'}</div>
        <TextInput fieldName="name" label="Name" onInput={updateName} value={state.template.name} />

        <TextInput
          fieldName="initTemplate"
          label="Initial Template"
          helperMarkdown="For generating the initial values for your introduction."
          onInput={updateInit}
          value={state.template.init}
          isMultiline
        />

        <TextInput
          fieldName="introFormat"
          label="Introduction Format"
          helperMarkdown="How to format your introduction. .\n\nYou can use any field derived from your **Initial Template**."
          placeholder="E.g. {{response}}"
          value={state.template.introduction}
          onInputText={(ev) => gameStore.updateTemplate({ introduction: ev })}
          isMultiline
        />

        <TextInput
          fieldName="responseFormat"
          label="Response Format"
          helperMarkdown="How to format responses for **display** and for **prompting** (`{{history}}*`).\n\nYou can use any field derived from your templates."
          placeholder="E.g. {{response}}"
          value={state.template.response}
          onInputText={(ev) => gameStore.updateTemplate({ response: ev })}
          isMultiline
        />

        <TextInput
          fieldName="historyTemplate"
          label="History Template"
          helperMarkdown="Use **{{history}}** in the game loop template"
          onInput={updateHistory}
          value={state.template.history}
          isMultiline
        />

        <TextInput
          fieldName="loopTemplate"
          label="Game Loop Template"
          helperMarkdown="Use **{{input}}** to use the user input"
          onInput={updateLoop}
          value={state.template.loop}
          isMultiline
        />

        <For each={store.errors}>
          {(error) => <div class="my-1 font-bold text-red-500">{error}</div>}
        </For>
        <div class="flex flex-col gap-1">
          <b>Fields</b>
          <Index each={state.template.fields.filter((f) => store.seen[f.name])}>
            {(field, i) => (
              <Field
                field={field()}
                onChange={onFieldChange(field().name)}
                override={over[field().name]}
                setOverride={(text) => updateOver(field().name, text)}
                session={state.state}
              />
            )}
          </Index>
        </div>

        <div class="flex flex-col gap-1" classList={{ hidden: lists().length === 0 }}>
          <b>Lists</b>
          <Index each={lists()}>
            {(list) => (
              <div class="grid" style={{ 'grid-template-columns': '1fr 3fr' }}>
                <Button disabled class="rounded-r-none">
                  {list().name}
                </Button>
                <TagInput
                  availableTags={list().options}
                  value={list().options}
                  fieldName="..."
                  onSelect={(next) => updateList(list().name, next)}
                />
              </div>
            )}
          </Index>
        </div>
      </div>
    </Convertible>
  )
}

const Field: Component<{
  field: GuidedField
  onChange: (next: Partial<GuidedField>) => void
  override?: string
  setOverride: (text: string) => void
  session: GuidedSession
}> = (props) => {
  const value = createMemo(() => {
    const name = props.field.name
    const last = props.session.responses.slice(-1)[0]
    return props.override || last?.[name] || props.session.init?.[name]
  })

  return (
    <div
      class="grid gap-0 rounded-md border-[1px] border-[var(--bg-600)]"
      style={{ 'grid-template-columns': '1fr 1.5fr 2fr' }}
    >
      <Show when={props.field.visible}>
        <Button
          schema="primary"
          onClick={() => props.onChange({ visible: false })}
          class="rounded-r-none"
        >
          {props.field.name}
        </Button>
      </Show>
      <Show when={!props.field.visible}>
        <Button
          schema="secondary"
          onClick={() => props.onChange({ visible: true })}
          class="rounded-r-none"
        >
          {props.field.name}
        </Button>
      </Show>
      <TextInput
        fieldName="label"
        value={props.field.label}
        class="h-[28px] rounded-l-none rounded-r-none"
        placeholder="Label"
        onInput={(ev) => props.onChange({ label: ev.currentTarget.value })}
      />
      <Switch>
        <Match when={props.field.list}>
          <TextInput
            fieldName="override"
            value={props.override}
            class="h-[28px] rounded-l-none rounded-r-md"
            placeholder="(Optional) value"
            onInput={(ev) => props.setOverride(ev.currentTarget.value)}
          />
        </Match>
        <Match when={!props.field.list}>
          <TextInput
            fieldName="override"
            value={props.override}
            class="h-[28px] rounded-l-none rounded-r-md"
            placeholder={value() ? `${value()}` : '(Optional) value'}
            onInput={(ev) => props.setOverride(ev.currentTarget.value)}
          />
        </Match>
      </Switch>
    </div>
  )
}
