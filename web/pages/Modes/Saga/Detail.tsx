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
import { SagaInput } from './Input'
import { SidePane } from './Pane'
import Button from '/web/shared/Button'
import { formatResponse, sagaStore } from './state'
import { markdown } from '/web/shared/markdown'
import { SagaResponse, SagaSession, SagaTemplate } from '/web/store/data/saga'
import Modal from '/web/shared/Modal'
import { GuidanceHelp } from './Help'
import {
  Cog,
  HelpCircle,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Scissors,
  Sliders,
  Trash,
} from 'lucide-solid'
import { toDuration, toMap } from '/web/shared/util'
import { useNavigate, useParams, useSearchParams } from '@solidjs/router'
import { ImportTemplate } from './ImportModal'
import Loading from '/web/shared/Loading'
import { DropMenu } from '/web/shared/DropMenu'

export function toSessionUrl(id: string) {
  return `/mode/preview/${id}${location.search}`
}

export const SagaDetail: Component = (props) => {
  const state = sagaStore()
  const params = useParams()
  const [search, setSearch] = useSearchParams()

  const [load, setLoad] = createSignal(false)
  const [pane, setPane] = createSignal(false)
  // const [image, setImage] = createSignal<string>()

  const trimResult = (i: number) => () => {
    const msg = state.state.responses[i]
    sagaStore.updateResponse(i, trim(msg.response))
  }

  onMount(() => {
    sagaStore.init(params.id)
    if (params.id === 'new' && !search.pane) {
      setSearch({ pane: 'prompt' })
    }
  })

  // PoC auto-image generation
  // createEffect((prev) => {
  // const last = state.state.responses.slice(-1)[0]
  // if (!last) return ''

  // const caption = last.caption ? `${last.caption}` : ''

  // if (caption && prev !== caption) {
  //   imageApi.generateImageAsync(caption).then((image) => setImage(image.data))
  // }

  // return last.summary
  // })

  // const headerImage = createMemo(() => {
  //   const src = image()
  //   if (!src) return null

  //   return <img src={src} class="h-full" />
  // })

  return (
    <>
      <ModeDetail
        loading={false}
        header={<Header template={state.template} session={state.state} />}
        footer={<Footer load={() => setLoad(true)} />}
        showPane={pane()}
        pane={<SidePane show={setPane} />}
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
                  siblings={state.state.responses.length}
                  trim={trimResult(i())}
                  text={formatResponse(state.template.display || '{{response}}', state.state, res)}
                />
              </>
            )}
          </For>
          <Show when={state.busy}>
            <Loading type="flashing" />
          </Show>
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
  const nav = useNavigate()
  const sessions = sagaStore((g) => {
    const templates = toMap(g.templates)
    const sessions = g.sessions
      .filter((sess) => sess.gameId in templates === true && !!sess.updated)
      .map((sess) => ({
        _id: sess._id,
        name: templates[sess.gameId].name,
        age: new Date(sess.updated ?? new Date()),
      }))
      .sort((l, r) => r.age.valueOf() - l.age.valueOf())
    return sessions
  })
  const load = (id: string) => {
    sagaStore.loadSession(id)
    nav(toSessionUrl(id))
    props.close()
  }

  return (
    <Modal maxWidth="half" show close={props.close}>
      <div class="flex flex-col gap-1">
        <For each={sessions}>
          {(sess) => (
            <Button onClick={() => load(sess._id)}>
              <span class="font-bold">{sess.name}</span> <sub>{toDuration(sess.age)} ago</sub>
            </Button>
          )}
        </For>
      </div>
    </Modal>
  )
}

const Header: Component<{ template: SagaTemplate; session: SagaSession }> = (props) => {
  const [_, setParams] = useSearchParams()
  return (
    <div class="flex w-full justify-between rounded-md p-1">
      <div class="flex items-center font-bold">{props.template.name || 'Untitled Template'}</div>
      <div class="flex gap-2">
        <Button onClick={() => setParams({ pane: 'prompt' })}>
          <Cog />
        </Button>
        <Button onClick={() => setParams({ pane: 'preset' })}>
          <Sliders />
        </Button>
        <Button onClick={() => sagaStore.setState({ showModal: 'help' })}>
          <HelpCircle />
        </Button>
      </div>
    </div>
  )
}

const Footer: Component<{ load: () => void }> = (props) => {
  const state = sagaStore()
  const params = useParams()
  const nav = useNavigate()

  const onSave = (session: SagaSession) => {
    if (session._id !== params.id) {
      nav(toSessionUrl(session._id))
    }
  }

  return (
    <div class="flex flex-col gap-2">
      <div class="flex gap-2">
        <Button size="pill" disabled={state.busy} onClick={sagaStore.start}>
          {state.state.init ? 'Restart' : 'Start'}
        </Button>
        <Show when={state.state.init}>
          <Button size="pill" onClick={() => sagaStore.newSession(state.template._id)}>
            Reset
          </Button>
        </Show>

        <Show when={state.sessions.length > 0}>
          <Button size="pill" onClick={props.load}>
            Load
          </Button>
        </Show>

        <Show when={state.state.init}>
          <Button size="pill" onClick={() => sagaStore.saveSession(onSave)} disabled={state.busy}>
            Save
          </Button>
        </Show>
        <MainMenu />
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
      <SagaInput onEnter={sagaStore.send} loading={state.busy} />
    </div>
  )
}

const MainMenu = () => {
  const [_, setParams] = useSearchParams()
  const [open, setOpen] = createSignal(false)

  return (
    <>
      <Button size="pill" onClick={() => setOpen(true)}>
        <MoreHorizontal size={20} />
      </Button>

      <DropMenu vert="up" horz="left" show={open()} close={() => setOpen(false)}>
        <div class="flex flex-col gap-1 p-2">
          <Button onClick={() => setParams({ pane: 'prompt' })}>Prompts</Button>
          <Button onClick={() => setParams({ pane: 'preset' })}>Preset</Button>
          <Button onClick={() => sagaStore.setState({ showModal: 'help' })}>Help</Button>
        </div>
      </DropMenu>
    </>
  )
}

const Msg: Component<{
  text: string | JSX.Element
  trim?: () => void
  index?: number
  user?: boolean
  msg?: SagaResponse
  siblings?: number
}> = (props) => {
  let ref: HTMLDivElement

  const canEdit = createMemo(() => props.index !== undefined && !!props.msg)
  const canRetry = createMemo(
    () => props.siblings !== undefined && props.index === props.siblings - 1
  )

  const html = createMemo(() =>
    typeof props.text === 'string' ? markdown.makeHtml(props.text) : props.text
  )

  createEffect(
    on(
      () => props.text,
      () => {
        if (props.text !== 'string') return
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

  const deleteMsg = () => {
    sagaStore.deleteResponse(props.index!)
  }

  const cancel = () => {
    setEdit(false)
    if (props.text !== 'string') return
    ref.innerText = props.text
  }

  const save = () => {
    const candidate = ref.innerText
    if (props.user) {
      sagaStore.updateInput(props.index!, candidate)
    } else {
      sagaStore.updateResponse(props.index!, candidate)
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
      <Show when={typeof props.text === 'string'}>
        <div innerHTML={html() as string} classList={{ hidden: editing() }} />
      </Show>
      <Show when={typeof props.text !== 'string'}>
        <div>{props.text}</div>
      </Show>
      <div
        ref={(ele) => {
          ref = ele
          if (props.text !== 'string') return
          ele.innerText = props.text
        }}
        contentEditable={editing()}
        classList={{ hidden: !editing() }}
        onKeyUp={onKeyUp}
      />
      <div class="flex w-full justify-end gap-1">
        <Button
          size="pill"
          schema="clear"
          onClick={props.trim}
          classList={{ hidden: editing() || !props.trim }}
        >
          <Scissors size={20} />
        </Button>

        <Show when={canEdit()}>
          <Button size="pill" schema="clear" onClick={edit} classList={{ hidden: editing() }}>
            <Pencil size={20} />
          </Button>
          <Show when={!props.user}>
            <Button
              size="pill"
              schema="clear"
              onClick={deleteMsg}
              classList={{ hidden: editing() }}
            >
              <Trash size={20} />
            </Button>
          </Show>

          <Show when={canRetry()}>
            <Button
              size="pill"
              schema="clear"
              onClick={sagaStore.retry}
              classList={{ hidden: editing() }}
            >
              <RefreshCw size={20} />
            </Button>
          </Show>

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
