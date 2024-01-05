import {
  Component,
  For,
  Index,
  JSX,
  Match,
  Show,
  Switch,
  createEffect,
  createMemo,
  createSignal,
  on,
  onMount,
} from 'solid-js'
import TextInput from '/web/shared/TextInput'
import Convertible from '../../Chat/Convertible'
import Button from '/web/shared/Button'
import { createStore } from 'solid-js/store'
import { gameStore } from './state'
import { GuidanceNode, parseTemplateV2 } from '/common/guidance/v2'
import { GuidedField, GuidedSession } from '/web/store/data/guided'
import Select, { Option } from '/web/shared/Select'
import TagInput from '/web/shared/TagInput'
import { Card, SolidCard } from '/web/shared/Card'
import { exportTemplate } from './util'
import { useSearchParams } from '@solidjs/router'
import { ModeGenSettings } from '/web/shared/Mode/ModeGenSettings'
import { BUILTIN_FORMATS } from '/common/presets/templates'
import { FormLabel } from '/web/shared/FormLabel'
import { neat } from '/common/util'

const FORMATS = Object.keys(BUILTIN_FORMATS).map((label) => ({ label, value: label }))

export const SidePane: Component<{ show: (show: boolean) => void }> = (props) => {
  const state = gameStore((s) => s.state)
  const [params, setParams] = useSearchParams()
  const [paneFooter, setPaneFooter] = createSignal<JSX.Element>()

  const closePane = () => setParams({ pane: '' })

  const updatePane = (pane: string) => {
    switch (pane) {
      case 'prompt':
      case 'preset':
        props.show(true)
        return
    }

    props.show(false)
  }

  onMount(() => {
    updatePane(params.pane)
  })

  createEffect(
    on(
      () => params.pane,
      () => {
        const pane = params.pane
        updatePane(pane)
      }
    )
  )

  return (
    <Switch>
      <Match when={params.pane === 'prompt'}>
        <GamePane close={closePane} />
      </Match>

      <Match when={params.pane === 'preset'}>
        <Convertible kind="partial" close={closePane} footer={paneFooter()}>
          <ModeGenSettings
            footer={setPaneFooter}
            presetId={state.presetId}
            close={closePane}
            onPresetChanged={(presetId) => gameStore.update({ presetId })}
          />
        </Convertible>
      </Match>
    </Switch>
  )
}

export const GamePane: Component<{ close: () => void }> = (props) => {
  let templateRef: HTMLSelectElement
  const state = gameStore((g) => ({ list: g.templates, template: g.template, state: g.state }))
  const [over, setOver] = createStore<Record<string, string>>(state.state.overrides || {})
  const [store, setState] = createStore({
    errors: [] as string[],
    seen: {} as Record<string, boolean>,
  })

  const [templateId, setTemplateId] = createSignal(state.list[0]?._id)

  createEffect((id) => {
    if (state.state._id === id) return
    setOver(state.state.overrides)
    return state.state._id
  }, state.state._id)

  createEffect(() => {
    const first = state.list[0]

    if (!templateId() && first) {
      setTemplateId(first._id)
    }
  })

  const loadTemplate = () => {
    console.log(templateRef.value, templateId())
    gameStore.loadTemplate(templateId())
  }

  const lists = createMemo(() => {
    const list = Object.entries(state.template.lists)
      .map(([name, options]) => ({ name, options }))
      .filter((entry) => {
        const visible = state.template.fields.some(
          (f) => f.list === entry.name && store.seen[f.name]
        )
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

  createEffect(
    on(diff, () => {
      const lists = { ...state.template.lists }
      const seen: Record<string, boolean> = {}
      const holders: string[] = []
      const errors: string[] = []
      const newFields: GuidedField[] = []

      const nodes: GuidanceNode[] = []

      try {
        const { ast, placeholders } = parseTemplateV2(state.template.init || '')
        holders.push(...placeholders)
        nodes.push(...ast)
      } catch (ex: any) {
        errors.push('Init:', ex.message)
      }

      try {
        const { ast, placeholders } = parseTemplateV2(state.template.loop || '')
        holders.push(...placeholders)
        nodes.push(...ast)
      } catch (ex: any) {
        errors.push('Loop:', ex.message)
      }

      for (const node of nodes) {
        if (node.kind !== 'variable') continue

        seen[node.name] = true
        const exists = newFields.find((n) => n.name === node.name)
        // Not quite sure if this matters
        // if (exists && exists.type !== node.type) {
        //   throw new Error(
        //     `Duplicate node ("${node.name}") found with mismatching type. Init: ${exists.type}, Loop: ${node.type}`
        //   )
        // }
        if (exists) continue

        const last = state.template.fields.find((n) => n.name === node.name)

        const listName = node.options
        newFields.push({
          name: node.name,
          type: node.type === 'options' || node.type === 'random' ? 'string' : node.type,
          visible: last?.visible ?? false,
          label: last?.label ?? '',
          list: listName,
        })

        if (listName && listName in lists === false) {
          lists[listName] = []
        }
      }

      const next = newFields.map((field) =>
        seen[field.name] ? field : { ...field, visible: false }
      )

      const manual = new Set(holders)
      for (const field of next) {
        if (field.name in seen === false) continue
        manual.delete(field.name)
      }

      manual.delete('history')
      manual.delete('input')
      manual.delete('response')

      setState({ errors, seen })
      gameStore.updateTemplate({ fields: next, lists, manual: Array.from(manual.values()) })
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

  const bg = 'bg-700'
  const opacity = 1

  const Footer = (
    <div class="flex flex-wrap gap-1">
      <Button onClick={gameStore.createTemplate}>New</Button>
      <Button onClick={gameStore.saveTemplate}>Save</Button>
      <Show when={state.template._id !== ''}>
        <Button onClick={gameStore.saveTemplateCopy}>Copy</Button>
        <Button onClick={() => exportTemplate(state.template._id)}>Export</Button>
      </Show>
      <Button onClick={() => gameStore.setState({ showModal: 'import' })}>Import</Button>
    </div>
  )

  return (
    <Convertible kind="partial" close={props.close} footer={Footer}>
      <div class="flex flex-col gap-4">
        <Show when={state.list.length > 0}>
          <SolidCard>
            <FormLabel label="Current Template" helperText={state.template.name} />
          </SolidCard>

          <Card bg={bg} bgOpacity={opacity}>
            <div class="font-bold">
              Load Template{' '}
              <a class="link ml-2 text-sm" onClick={gameStore.createTemplate}>
                New Template
              </a>
            </div>
            <div class="flex gap-1">
              <Select
                fieldName="templateId"
                items={items()}
                value={templateId()}
                onChange={(ev) => setTemplateId(ev.value)}
                ref={(ref) => (templateRef = ref)}
              />
              <Button onClick={loadTemplate}>Load</Button>
            </div>
          </Card>
        </Show>

        <Card bg={bg} bgOpacity={opacity}>
          <TextInput
            fieldName="name"
            label="Name"
            onInput={updateName}
            value={state.template.name}
          />
        </Card>

        <Card bg={bg} bgOpacity={opacity}>
          <Select
            fieldName="format"
            label="Format"
            items={FORMATS}
            value={state.state.format}
            onChange={(item) => gameStore.update({ format: item.value as any })}
          />
        </Card>

        <Card bg={bg} bgOpacity={opacity}>
          <TextInput
            fieldName="initTemplate"
            label="Initial Template"
            helperMarkdown="For generating the initial values for your introduction."
            onInput={updateInit}
            value={state.template.init}
            isMultiline
          />
        </Card>

        <Card bg={bg} bgOpacity={opacity}>
          <TextInput
            fieldName="introFormat"
            label="Introduction Format"
            helperMarkdown="How to format your introduction. .\n\nYou can use any field derived from your **Initial Template**."
            placeholder="E.g. {{response}}"
            value={state.template.introduction}
            onInputText={(ev) => gameStore.updateTemplate({ introduction: ev })}
            isMultiline
          />
        </Card>

        <Card bg={bg} bgOpacity={opacity}>
          <TextInput
            fieldName="responseFormat"
            label="Response Prompt Format"
            helperMarkdown="How to format responses for **prompting** (`{{history}}*`).
          You can use any field derived from your templates."
            placeholder="E.g. {{response}}"
            value={state.template.response}
            onInputText={(ev) => gameStore.updateTemplate({ response: ev })}
            isMultiline
          />
        </Card>

        <Card bg={bg} bgOpacity={opacity}>
          <TextInput
            fieldName="displayFormat"
            label="Response Display Format (Optional)"
            helperMarkdown="How to display responses for **display** (Uses **Response Prompt Format** if empty)
           You can use any field derived from your templates."
            placeholder="E.g. {{response}}"
            value={state.template.display}
            onInputText={(ev) => gameStore.updateTemplate({ display: ev })}
            isMultiline
          />
        </Card>

        <Card bg={bg} bgOpacity={opacity}>
          <TextInput
            fieldName="historyTemplate"
            label="History Template"
            helperMarkdown="Use **{{history}}** in the game loop template"
            onInput={updateHistory}
            value={state.template.history}
            isMultiline
          />
        </Card>

        <Card bg={bg} bgOpacity={opacity}>
          <TextInput
            fieldName="loopTemplate"
            label="Game Loop Template"
            helperMarkdown="Use **{{input}}** to use the user input"
            onInput={updateLoop}
            value={state.template.loop}
            isMultiline
          />
        </Card>

        <For each={store.errors}>
          {(error) => <div class="my-1 font-bold text-red-500">{error}</div>}
        </For>

        <div class="flex flex-col gap-1">
          <FormLabel
            label="Manual Fields"
            helperMarkdown={`These fields are required to be filled out by you`}
          />
          <Index each={state.template.manual}>
            {(field, i) => (
              <ManualField
                field={field()}
                override={over[field()]}
                setOverride={(text) => updateOver(field(), text)}
                session={state.state}
              />
            )}
          </Index>
        </div>

        <div class="flex flex-col gap-1">
          <FormLabel
            label="Fields"
            helperMarkdown={neat`
          **Toggle**: Controls whether the field appears in the chat window.
          **Label**: When enabled, how the field will be named in the chat window.
          **Value**: Override the value instead of generating it.
          `}
          />
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
                <Button disabled class="h-full rounded-r-none">
                  {list().name}
                </Button>
                <TagInput
                  availableTags={list().options}
                  value={list().options}
                  fieldName="..."
                  placeholder="Add items..."
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

const ManualField: Component<{
  field: string
  override?: string
  setOverride: (text: string) => void
  session: GuidedSession
}> = (props) => {
  return (
    <div
      class="grid gap-0 rounded-md border-[1px] bg-[var(--hl-700)]"
      classList={{
        'border-[var(--bg-600)]': !!props.override,
        'border-[var(--red-600)]': !props.override,
      }}
      style={{ 'grid-template-columns': '1fr 3.5fr' }}
    >
      <div class="flex items-center justify-center pl-2">{props.field}</div>
      <TextInput
        fieldName="override"
        value={props.override}
        class="h-[28px] rounded-l-none rounded-r-md"
        placeholder={props.override ? props.override : '(Required) value'}
        onInput={(ev) => props.setOverride(ev.currentTarget.value)}
      />
    </div>
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
