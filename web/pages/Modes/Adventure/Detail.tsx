import { Component, For, JSX, Show, createMemo, createSignal } from 'solid-js'
import { ModeDetail } from '/web/shared/Mode/Detail'
import { AdventureInput } from './Input'
import { msgsApi } from '/web/store/data/messages'
import { GamePane } from './Pane'
import { createStore } from 'solid-js/store'
import Button from '/web/shared/Button'
import { gameStore } from './state'
import { parseTemplateV2 } from '/common/guidance/v2'
import { storage } from '/web/shared/util'
import { markdown } from '/web/shared/markdown'

export const AdventureDetail: Component = (props) => {
  const game = gameStore((g) => g.game)
  const [store, update] = createStore({
    init: {} as Record<string, string>,
    results: [] as Array<Record<string, string>>,
    busy: false,
    started: false,
  })

  const [canLoad, setCanLoad] = createSignal(!!storage.localGetItem('rpg-save-state'))

  const trimResult = (i: number) => () => {
    const msg = { ...store.results[i] }
    msg.response = trim(msg.response)
    update({ results: store.results.map((r, idx) => (idx === i ? msg : r)) })
  }

  const save = () => {
    storage.localSetItem(
      `rpg-save-state`,
      JSON.stringify({
        init: store.init,
        results: store.results,
        started: store.started,
        busy: false,
      })
    )
    setCanLoad(true)
  }

  const undo = () => {
    if (!store.results.length) {
      return
    }

    const results = store.results.slice(0, -1)

    update({ results })
  }

  const retry = () => {
    if (!store.results.length) {
      return
    }

    const results = store.results.slice(0, -1)
    const last = store.results.slice(-1)[0]

    update({ results })
    send(last.input, () => {})
  }

  const load = () => {
    const prev = storage.localGetItem('rpg-save-state')
    if (!prev) return
    const obj = JSON.parse(prev)
    update({
      init: obj.init,
      results: obj.results,
      started: obj.started,
    })
  }

  const send = async (text: string, onSuccess: () => void) => {
    update('busy', true)
    const historyAst = parseTemplateV2(game.history || ' ')
    let history: string[] = []

    for (const result of store.results) {
      let line = ''
      for (const node of historyAst) {
        if (node.kind === 'text') {
          line += node.text
          continue
        }

        const value = result[node.name] || ''
        line += value
      }
      history.push(line)
    }

    // const loopAst = parseTemplateV2(game.loop.replace('{{input}}', text) || ' ')
    // let loop = ''
    // for (const node of loopAst) {
    //   if (node.kind === 'text') {
    //     loop += node.text
    //     continue
    //   }

    //   loop += store.last?.[node.name] || store.init[node.name] || ''
    // }

    const last = store.results.slice(-1)[0]
    const previous = Object.assign({}, store.init, last || {})

    console.log(history.join('\n'))

    let prompt = game.loop
      .replace('{{input}}', text)
      .replace('{{history}}', history.join('\n'))
      .replace(/\n\n+/g, '\n\n')

    for (const [key, value] of Object.entries(previous)) {
      prompt = prompt.replace(`{{${key}}}`, value)
    }

    console.log(prompt)
    const result = await msgsApi.guidance({ prompt })
    onSuccess()

    result.input = text
    const next = store.results.concat(result)
    update({ results: next, busy: false })
  }

  const start = async () => {
    update('busy', true)
    const result = await msgsApi.guidance({ prompt: game.init })
    update({ busy: false, init: result, started: true })
  }

  return (
    <ModeDetail loading={false} header={<Header />} pane={<GamePane />}>
      <div class="flex flex-col gap-2">
        <Show when={!!store.init.goal}>
          <Msg text={`Your goal ${store.init.goal}`} />
          <Msg text={`You are ${store.init.intro}`} />
          <Msg text={store.init.scene} />
        </Show>

        <For each={store.results}>
          {(res, i) => (
            <>
              <UserMsg text={res.input} />
              <Msg trim={trimResult(i())} text={res.response || res.intro} />
            </>
          )}
        </For>
        <div class="flex gap-2">
          <Button size="pill" disabled={store.busy} onClick={start}>
            {store.started ? 'Restart' : 'Start'}
          </Button>
          <Show when={store.started}>
            <Button size="pill" onClick={() => update({ results: [] })}>
              Reset
            </Button>
          </Show>

          <Show when={store.started}>
            <Button size="pill" onClick={save}>
              Save
            </Button>
          </Show>

          <Show when={canLoad()}>
            <Button size="pill" onClick={load}>
              Load
            </Button>
          </Show>

          <Show when={store.results.length > 0}>
            <Button size="pill" onClick={retry}>
              Retry
            </Button>
          </Show>

          <Show when={store.results.length > 0}>
            <Button size="pill" onClick={undo}>
              Undo
            </Button>
          </Show>
        </div>
        <div class="flex flex-wrap gap-1">
          <For each={game.fields.filter((f) => f.visible)}>
            {(field) => (
              <Label label={field.label || field.name}>
                {store.results.slice(-1)[0]?.[field.name] ?? store.init[field.name] ?? '...'}
              </Label>
            )}
          </For>
        </div>
        <AdventureInput onEnter={send} loading={store.busy} />
      </div>
    </ModeDetail>
  )
}

const Header = () => {
  return <div class="flex-colbg-800 flex w-full rounded-md px-1 py-2">Hello Header</div>
}

const Msg: Component<{ text: string; trim?: () => void; edit?: () => void }> = (props) => {
  const html = createMemo(() => markdown.makeHtml(props.text))
  return (
    <div class="bg-700 flex w-full flex-col gap-1 rounded-md px-2 py-1">
      <div innerHTML={html()}></div>
      <div class="flex w-full justify-end gap-1">
        <Show when={!!props.trim}>
          <Button size="pill" schema="secondary" onClick={props.trim}>
            Trim
          </Button>
        </Show>
        <Show when={!!props.edit}>
          <Button size="pill" schema="secondary" onClick={props.edit}>
            Edit
          </Button>
        </Show>
      </div>
    </div>
  )
}

const UserMsg: Component<{ text: string; trim?: () => void; edit?: () => void }> = (props) => {
  const html = createMemo(() => markdown.makeHtml(props.text))
  return (
    <div class="bg-800 flex w-full flex-col gap-1 rounded-md px-2 py-1">
      <div innerHTML={html()}></div>
      <div class="flex w-full justify-end gap-1">
        <Show when={!!props.trim}>
          <Button size="pill" schema="secondary" onClick={props.trim}>
            Trim
          </Button>
        </Show>
        <Show when={!!props.edit}>
          <Button size="pill" schema="secondary" onClick={props.edit}>
            Edit
          </Button>
        </Show>
      </div>
    </div>
  )
}

const Label: Component<{ label: string; children: JSX.Element }> = (props) => {
  return (
    <div class="flex gap-0 rounded-md border-[1px] border-[var(--bg-700)]">
      <div class="bg-700 rounded-l-md px-2 py-1">{props.label}</div>
      <div class="bg-900 rounded-r-md px-2 py-1">{props.children}</div>
    </div>
  )
}

function trim(text: string) {
  const ends = ['.', '?', '"', '!']

  const index = ends
    .map((end) => text.lastIndexOf(end))
    .reduce((prev, curr) => (curr > prev ? curr : prev), -1)

  if (index === -1) return text

  return text.slice(0, index + 1)
}
