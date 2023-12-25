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
  on,
  onMount,
} from 'solid-js'
import { ModeDetail } from '/web/shared/Mode/Detail'
import { AdventureInput } from './Input'
import { GamePane } from './Pane'
import Button from '/web/shared/Button'
import { formatResponse, gameStore } from './state'
import { markdown } from '/web/shared/markdown'
import { GuidedResponse, GuidedSession, GuidedTemplate } from '/web/store/data/guided'
import Modal from '/web/shared/Modal'
import { GuidanceHelp } from './Help'
import { Cog, HelpCircle } from 'lucide-solid'
import { toDuration, toMap } from '/web/shared/util'
import { useSearchParams } from '@solidjs/router'
import { ImportTemplate } from './ImportModal'
// import { imageApi } from '/web/store/data/image'

export const AdventureDetail: Component = (props) => {
  let input: HTMLTextAreaElement
  const state = gameStore()
  const [params, setParams] = useSearchParams()
  const [load, setLoad] = createSignal(false)

  const trimResult = (i: number) => () => {
    const msg = state.state.responses[i]
    gameStore.updateResponse(i, trim(msg.response))
  }

  const closePane = () => setParams({ pane: '' })

  onMount(() => {
    gameStore.init()
  })

  // PoC auto-image generation
  // createEffect((prev) => {
  //   const last = state.state.responses.slice(-1)[0]
  //   if (!last) return ''

  //   const caption = last.summary ? `${last.summary}` : ''

  //   if (caption && prev !== caption) {
  //     imageApi.generateImageAsync(caption).then((image) => setImage(image.data))
  //   }

  //   return last.summary
  // })

  // const headerImage = createMemo(() => {
  //   const src = image()
  //   if (!src) return null

  //   return <img src={src} class="h-full" />
  // })

  const undo = () => {
    const last = state.state.responses.slice(-1)[0]

    if (last?.input && input && !input.value.trim()) {
      input.value = last.input
    }

    gameStore.undo()
  }

  const sidePane = createMemo(() => {
    if (!params.pane) return null

    switch (params.pane) {
      case 'prompt':
        return <GamePane close={closePane} />
    }

    return null
  })

  return (
    <>
      <ModeDetail
        loading={false}
        header={<Header template={state.template} session={state.state} />}
        pane={sidePane()}
        // split={headerImage()}
        splitHeight={30}
      >
        <div class="flex flex-col gap-2">
          <Show when={!!state.state.init}>
            <Msg
              text={formatResponse(state.template.introduction, state.state, state.state.init!)}
            />
          </Show>

          <For each={state.state.responses}>
            {(res, i) => (
              <>
                <Msg msg={res} text={res.input} user index={i()} />
                <Msg
                  msg={res}
                  index={i()}
                  trim={trimResult(i())}
                  text={formatResponse(
                    state.template.display || state.template.response || '{{response}}',
                    state.state,
                    res
                  )}
                />
              </>
            )}
          </For>
          <div class="flex gap-2">
            <Button size="pill" disabled={state.busy} onClick={gameStore.start}>
              {state.state.init ? 'Restart' : 'Start'}
            </Button>
            <Show when={state.state.init}>
              <Button size="pill" onClick={() => gameStore.update({ responses: [], gameId: '' })}>
                Reset
              </Button>
            </Show>

            <Show when={state.sessions.length > 0}>
              <Button size="pill" onClick={() => setLoad(true)}>
                Load
              </Button>
            </Show>

            <Show when={state.state.init}>
              <Button size="pill" onClick={gameStore.saveSession} disabled={state.busy}>
                Save
              </Button>
            </Show>

            <Show when={state.state.responses.length > 0}>
              <Button size="pill" onClick={gameStore.retry} disabled={state.busy}>
                Retry
              </Button>
            </Show>

            <Show when={state.state.responses.length > 0}>
              <Button size="pill" onClick={undo} disabled={state.busy}>
                Undo
              </Button>
            </Show>
          </div>
          <div class="flex flex-wrap gap-1">
            <For each={state.template.fields.filter((f) => f.visible)}>
              {(field) => (
                <Label label={field.label || field.name}>
                  {(state.state.overrides?.[field.name] ||
                    state.state.responses.slice(-1)[0]?.[field.name]) ??
                    state.state.init?.[field.name] ??
                    '...'}
                </Label>
              )}
            </For>
          </div>
          <AdventureInput
            onEnter={gameStore.send}
            loading={state.busy}
            input={(ele) => (input = ele)}
          />
        </div>
      </ModeDetail>
      <Show when={load()}>
        <LoadModal close={() => setLoad(false)} />
      </Show>
      <Switch>
        <Match when={state.showModal === 'help'}>
          <GuidanceHelp />
        </Match>

        <Match when={state.showModal === 'import'}>
          <ImportTemplate />
        </Match>
      </Switch>
    </>
  )
}

const LoadModal: Component<{ close: () => void }> = (props) => {
  const sessions = gameStore((g) => {
    const templates = toMap(g.templates)
    const sessions = g.sessions.map((sess) => ({
      _id: sess._id,
      name: templates[sess.gameId].name,
      age: new Date(sess.updated ?? new Date()),
    }))
    return sessions
  })
  const load = (id: string) => {
    gameStore.loadSession(id)
    props.close()
  }

  return (
    <Modal maxWidth="half" show close={props.close}>
      <div class="flex flex-col gap-1">
        <For each={sessions}>
          {(sess) => (
            <Button onClick={() => load(sess._id)}>
              {sess.name} {toDuration(sess.age)}
            </Button>
          )}
        </For>
      </div>
    </Modal>
  )
}

const Header: Component<{ template: GuidedTemplate; session: GuidedSession }> = (props) => {
  const [_, setParams] = useSearchParams()
  return (
    <div class="bg-800 flex w-full justify-between rounded-md px-1 py-2">
      <div>{props.template.name || 'Untitled Template'}</div>
      <div class="flex gap-2">
        <Button onClick={() => setParams({ pane: 'prompt' })}>
          <Cog />
        </Button>
        <Button onClick={() => gameStore.setState({ showModal: 'help' })}>
          <HelpCircle />
        </Button>
      </div>
    </div>
  )
}

const Msg: Component<{
  text: string
  trim?: () => void
  index?: number
  user?: boolean
  msg?: GuidedResponse
}> = (props) => {
  let ref: HTMLDivElement

  const canEdit = createMemo(() => props.index !== undefined && !!props.msg)

  const html = createMemo(() => markdown.makeHtml(props.text))

  createEffect(
    on(
      () => props.text,
      () => {
        if (ref.innerText === props.text) return
        ref.innerText = props.text
      }
    )
  )

  const edit = () => {
    if (!props.msg) return
    setEdit(true)
    ref.innerText = props.user ? props.msg.input : props.msg.response
    ref.focus()
  }

  const cancel = () => {
    ref.innerText = props.text
    setEdit(false)
  }

  const save = () => {
    const candidate = ref.innerText
    if (props.user) {
      gameStore.updateInput(props.index!, candidate)
    } else {
      gameStore.updateResponse(props.index!, candidate)
    }
    setEdit(false)
  }

  const onKeyUp = (ev: KeyboardEvent) => {
    if (ev.altKey && ev.key === 's') {
      ev.preventDefault()
      save()
    }
  }

  const [editing, setEdit] = createSignal(false)
  return (
    <div
      class="rendered-markdown flex w-full flex-col gap-1 rounded-md px-2 py-1"
      classList={{
        'bg-700': !props.user,
        'bg-800': !!props.user,
      }}
    >
      <div innerHTML={html()} classList={{ hidden: editing() }} />
      <div
        ref={(ele) => {
          ref = ele
          ele.innerText = props.text
        }}
        contentEditable={editing()}
        classList={{ hidden: !editing() }}
        onKeyUp={onKeyUp}
      />
      <div class="flex w-full justify-end gap-1">
        <Button
          size="pill"
          schema="secondary"
          onClick={props.trim}
          classList={{ hidden: editing() }}
        >
          Trim
        </Button>

        <Show when={canEdit()}>
          <Button size="pill" schema="secondary" onClick={edit} classList={{ hidden: editing() }}>
            Edit
          </Button>
          <Button size="pill" schema="success" classList={{ hidden: !editing() }} onClick={save}>
            Save
          </Button>
          <Button size="pill" schema="error" classList={{ hidden: !editing() }} onClick={cancel}>
            Cancel
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
    .map((end) => {
      const last = text.lastIndexOf(end)
      if (last === text.length - 1) return text.slice(0, -1).lastIndexOf(end)
      return last
    })
    .reduce((prev, curr) => (curr > prev ? curr : prev), -1)

  if (index === -1) return text

  return text.slice(0, index + 1)
}
