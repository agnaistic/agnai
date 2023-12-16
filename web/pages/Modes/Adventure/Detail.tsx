import {
  Component,
  For,
  JSX,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onMount,
} from 'solid-js'
import { ModeDetail } from '/web/shared/Mode/Detail'
import { AdventureInput } from './Input'
import { GamePane } from './Pane'
import Button from '/web/shared/Button'
import { formatResponse, gameStore } from './state'
import { markdown } from '/web/shared/markdown'
import { GuidedSession, GuidedTemplate } from '/web/store/data/guided'
import Modal from '/web/shared/Modal'
// import { imageApi } from '/web/store/data/image'

export const AdventureDetail: Component = (props) => {
  let input: HTMLTextAreaElement
  const state = gameStore()
  const [load, setLoad] = createSignal(false)
  const [image, _setImage] = createSignal<string>()
  const canLoad = createMemo(() => state.sessions.some((s) => s.gameId === state.template._id))

  const trimResult = (i: number) => () => {
    const msg = { ...state.state.responses[i] }
    msg.response = trim(`${msg.response}`)
    gameStore.update({ responses: state.state.responses.map((r, idx) => (idx === i ? msg : r)) })
  }

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

  const headerImage = createMemo(() => {
    const src = image()
    if (!src) return null

    return <img src={src} class="h-full" />
  })

  const undo = () => {
    const last = state.state.responses.slice(-1)[0]

    if (last?.input && input && !input.value.trim()) {
      input.value = last.input
    }

    gameStore.undo()
  }

  return (
    <>
      <ModeDetail
        loading={false}
        header={<Header template={state.template} session={state.state} />}
        pane={<GamePane />}
        split={headerImage()}
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
                <UserMsg text={res.input} />
                <Msg
                  trim={trimResult(i())}
                  text={formatResponse(state.template.response, state.state, res)}
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

            <Show when={canLoad()}>
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
    </>
  )
}

const LoadModal: Component<{ close: () => void }> = (props) => {
  const sessions = gameStore((g) => g.sessions.filter((s) => s.gameId === g.template._id))
  const load = (id: string) => {
    gameStore.loadSession(id)
    props.close()
  }

  return (
    <Modal maxWidth="half" show close={props.close}>
      <div class="flex flex-col gap-1">
        <For each={sessions}>
          {(sess) => <Button onClick={() => load(sess._id)}>{sess._id}</Button>}
        </For>
      </div>
    </Modal>
  )
}

const Header: Component<{ template: GuidedTemplate; session: GuidedSession }> = (props) => {
  return (
    <div class="flex-colbg-800 flex w-full rounded-md px-1 py-2">
      <div>{props.template.name || 'Untitled Template'}</div>
    </div>
  )
}

const Msg: Component<{ text: string; trim?: () => void; edit?: () => void }> = (props) => {
  const html = createMemo(() => markdown.makeHtml(props.text))
  return (
    <div class="bg-700 rendered-markdown flex w-full flex-col gap-1 rounded-md px-2 py-1">
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
    <div class="bg-800 rendered-markdown flex w-full flex-col gap-1 rounded-md px-2 py-1">
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
    .map((end) => {
      const last = text.lastIndexOf(end)
      if (last === text.length - 1) return text.slice(0, -1).lastIndexOf(end)
      return last
    })
    .reduce((prev, curr) => (curr > prev ? curr : prev), -1)

  if (index === -1) return text

  return text.slice(0, index + 1)
}
