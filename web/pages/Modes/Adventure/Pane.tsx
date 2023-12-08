import { Component, For, Index, Show, createEffect, on } from 'solid-js'
import TextInput from '/web/shared/TextInput'
import Convertible from '../../Chat/Convertible'
import Button from '/web/shared/Button'
import { createStore } from 'solid-js/store'
import { GameField, gameStore } from './state'
import { parseTemplateV2 } from '/common/guidance/v2'

export const GamePane: Component = (props) => {
  const game = gameStore((g) => g.game)

  const [state, setState] = createStore({
    errors: [] as string[],
    seen: {} as Record<string, boolean>,
  })

  createEffect(
    on(
      () => game.init + game.loop,
      () => {
        const next = game.fields.slice()
        const seen: Record<string, boolean> = {}
        const errors: string[] = []

        try {
          const initAst = parseTemplateV2(game.init)
          for (const node of initAst) {
            if (node.kind !== 'variable') continue

            seen[node.name] = true
            const exists = next.some((n) => n.name === node.name)

            if (exists) continue
            next.push({
              name: node.name,
              type: node.num ? 'number' : node.boolean ? 'boolean' : 'string',
              visible: false,
              label: '',
            })
          }
        } catch (ex: any) {
          errors.push('Init:', ex.message)
        }

        try {
          const loopAst = parseTemplateV2(game.loop || ' ')
          for (const node of loopAst) {
            if (node.kind !== 'variable') continue
            seen[node.name] = true
            const exists = next.some((n) => n.name === node.name)
            if (exists) continue
            next.push({
              name: node.name,
              type: node.num ? 'number' : node.boolean ? 'boolean' : 'string',
              visible: false,
              label: '',
            })
          }
        } catch (ex: any) {
          errors.push('Loop:', ex.message)
        }

        setState({ errors, seen })
        gameStore.update({ fields: next })
        localStorage.setItem('rpg-fields', JSON.stringify(next))
      }
    )
  )

  const updateName: FormHandler = (ev) => gameStore.update({ name: ev.currentTarget.value })
  const updateInit: FormHandler = (ev) => gameStore.update({ init: ev.currentTarget.value })
  const updateLoop: FormHandler = (ev) => gameStore.update({ loop: ev.currentTarget.value })
  const updateHistory: FormHandler = (ev) => gameStore.update({ history: ev.currentTarget.value })

  const onFieldChange = (name: string) => (next: Partial<GameField>) => {
    const fields = game.fields.map((prev) => (prev.name === name ? { ...prev, ...next } : prev))
    gameStore.update({ fields })
    localStorage.setItem('rpg-fields', JSON.stringify(fields))
  }

  return (
    <Convertible kind="partial" close={() => {}}>
      <div class="flex flex-col gap-4">
        <div class="flex gap-1">
          <Button onClick={gameStore.create}>New</Button>
        </div>
        <TextInput fieldName="name" label="Name" onInput={updateName} value={game.name} />

        <TextInput
          fieldName="initTemplate"
          label="Init Template"
          onInput={updateInit}
          value={game.init}
          isMultiline
        />

        <TextInput
          fieldName="historyTemplate"
          label="History Template"
          helperMarkdown="Use **{{history}}** in the game loop template"
          onInput={updateHistory}
          value={game.history}
          isMultiline
        />

        <TextInput
          fieldName="loopTemplate"
          label="Game Loop Template"
          helperMarkdown="Use **{{input}}** to use the user input"
          onInput={updateLoop}
          value={game.loop}
          isMultiline
        />

        <For each={state.errors}>
          {(error) => <div class="my-1 font-bold text-red-500">{error}</div>}
        </For>
        <div class="flex flex-wrap gap-1">
          <Index each={game.fields.filter((f) => state.seen[f.name])}>
            {(field, i) => <Field field={field()} onChange={onFieldChange(field().name)} />}
          </Index>
        </div>

        {/* <div class="w-full max-w-full">
          <pre class="text-xs" style={{ 'word-wrap': 'break-word', 'white-space': 'pre-wrap' }}>
            {initPrompt()}
          </pre>
        </div> */}
      </div>
    </Convertible>
  )
}

const Field: Component<{ field: GameField; onChange: (next: Partial<GameField>) => void }> = (
  props
) => {
  return (
    <div class="flex gap-0 rounded-md border-[1px] border-[var(--bg-600)]">
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
        class="h-[28px] rounded-l-none"
        onInput={(ev) => props.onChange({ label: ev.currentTarget.value })}
      />
    </div>
  )
}
