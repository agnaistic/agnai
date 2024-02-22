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
  onMount,
} from 'solid-js'
import { ModeDetail } from '/web/shared/Mode/Detail'
import { SagaInput } from './Input'
import { SidePane } from './Pane'
import Button from '/web/shared/Button'
import { formatResponse, sagaStore } from './state'
import { markdown } from '/web/shared/markdown'
import { SagaSession, SagaTemplate } from '/web/store/data/saga'
import Modal from '/web/shared/Modal'
import { GuidanceHelp } from './Help'
import { Cog, HelpCircle, MoreHorizontal, Pencil, RefreshCw, Sliders, Trash } from 'lucide-solid'
import { createDebounce, toDuration, toMap } from '/web/shared/util'
import { useNavigate, useParams, useSearchParams } from '@solidjs/router'
import { ImportTemplate } from './ImportModal'
import Loading from '/web/shared/Loading'
import { DropMenu } from '/web/shared/DropMenu'
import { createStore } from 'solid-js/store'
import { Pill } from '/web/shared/Card'
import { imageApi } from '/web/store/data/image'
import { getTemplateFields } from './util'

export function toSessionUrl(id: string) {
  return `/saga/${id}${location.search}`
}

export const SagaDetail: Component = (props) => {
  const state = sagaStore()
  const params = useParams()
  const [search, setSearch] = useSearchParams()

  const [load, setLoad] = createSignal(false)
  const [pane, setPane] = createSignal(false)
  const [stage, setStage] = createSignal<'ready' | 'rendering' | 'done'>('ready')
  const [lastCaption, setCaption] = createSignal('')
  const [image, setImage] = createSignal<string>()

  onMount(() => {
    sagaStore.init(params.id, generateImage)
    if (params.id === 'new' && !search.pane) {
      setSearch({ pane: 'prompt' })
    }
  })

  createEffect(() => {
    const now = stage()
    const busy = state.busy
    if (now === 'done' && !busy) {
      setStage('ready')
    }
  })

  const [generateImage] = createDebounce((auto?: boolean) => {
    if (!state.template.imagesEnabled || !state.template.imagePrompt) return
    if (stage() === 'rendering') return

    const last = state.state.responses.slice(-1)[0] || state.state.init
    if (!last) return

    const caption = formatResponse(state.template.imagePrompt, state.state, last)

    if (auto && lastCaption() === caption) return

    setCaption(caption)
    setStage('rendering')
    imageApi.generateImageAsync(caption, { noAffix: true }).then((image) => {
      setStage('done')
      setImage(image.data)
    })
  }, 100)

  onMount(() => {})

  const headerImage = createMemo(() => {
    const src = image()
    if (!src) return null

    return <img src={src} class="h-full" />
  })

  const sendMessage = (text: string, done?: () => void) => {
    sagaStore.send(text, (err) => {
      if (err) return
      done?.()
      generateImage(true)
    })
  }

  return (
    <>
      <ModeDetail
        loading={false}
        header={<Header template={state.template} session={state.state} />}
        footer={<Footer load={() => setLoad(true)} regenImage={generateImage} send={sendMessage} />}
        showPane={pane()}
        pane={<SidePane show={setPane} />}
        split={headerImage()}
        splitHeight={30}
      >
        <div class="flex flex-col gap-2">
          <Show when={!!state.state.init}>
            <Response
              template={state.template}
              type="intro"
              msg={state.state.init!}
              session={state.state}
            />
          </Show>

          <For each={state.state.responses}>
            {(res, i) => (
              <>
                <Response
                  template={state.template}
                  type="input"
                  msg={res}
                  session={state.state}
                  index={i()}
                />
                <Response
                  template={state.template}
                  type="response"
                  msg={res}
                  session={state.state}
                  siblings={state.state.responses.length}
                  index={i()}
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

const Footer: Component<{
  load: () => void
  regenImage: () => void
  send: (text: string, onSuccess?: () => void) => void
}> = (props) => {
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
          <Button
            size="pill"
            onClick={() => sagaStore.newSession(state.template._id, (id) => nav(toSessionUrl(id)))}
          >
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

        <Show when={state.template.imagesEnabled && state.template.imagePrompt}>
          <Button size="pill" onClick={() => props.regenImage()} disabled={state.busy}>
            Re-image
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
      <SagaInput onEnter={props.send} loading={state.busy} />
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

const Response: Component<{
  template: SagaTemplate
  session: SagaSession
  type: 'input' | 'response' | 'intro'
  siblings?: number
  msg: Record<string, any>
  index?: number
}> = (props) => {
  const [edit, setEdit] = createSignal(false)
  const [mods, setMods] = createStore<Record<string, string>>({})

  const updateMod = (field: string, ev: any) => {
    const value = ev.target.innerText
    setMods({ ...mods, [field]: value })
  }

  const canRetry = createMemo(
    () => props.siblings !== undefined && props.index === props.siblings - 1
  )

  const template = createMemo(() => {
    switch (props.type) {
      case 'input':
        return '{{input}}'

      case 'response':
        return props.template.display

      case 'intro':
        return props.template.introduction
    }
  })

  const fields = createMemo(() => getTemplateFields(template()))

  const startEdit = () => {
    switch (props.type) {
      case 'input':
        setMods({ input: props.msg.input })
        break

      case 'intro':
      case 'response':
        setMods({ ...props.msg })
        break
    }

    setEdit(true)
  }

  const text = createMemo(() => formatResponse(template(), props.session, props.msg))

  const save = () => {
    setEdit(false)

    switch (props.type) {
      case 'input':
      case 'response':
        sagaStore.updateMsg(props.index!, mods)
        break

      case 'intro':
        sagaStore.updateIntro(mods)
        break
    }
  }

  return (
    <>
      <div
        class="rendered-markdown flex w-full flex-col gap-1 rounded-md px-2 py-1"
        classList={{
          'bg-800': props.type === 'intro' || props.type === 'response',
          'bg-700': props.type === 'input',
        }}
      >
        <Show when={!edit()}>
          <div innerHTML={markdown.makeHtml(text())} />
        </Show>
        <Show when={edit()}>
          <div class="flex flex-col gap-1">
            <For each={fields()}>
              {(field) => (
                <div class="bg-700 p-1 text-sm">
                  <Pill small type="hl">
                    {field}
                  </Pill>
                  <div
                    ref={(r) => (r.innerText = mods[field])}
                    contentEditable
                    onKeyUp={(ev) => updateMod(field, ev)}
                  ></div>
                </div>
              )}
            </For>
          </div>
        </Show>
        <div class="flex justify-end gap-1">
          <Show when={!edit()}>
            <Button size="pill" schema="clear" onClick={startEdit}>
              <Pencil size={20} />
            </Button>

            <Show when={props.type === 'response'}>
              <Button
                size="pill"
                schema="clear"
                onClick={() => sagaStore.deleteResponse(props.index!)}
              >
                <Trash size={20} />
              </Button>
              <Button
                size="pill"
                schema="clear"
                onClick={sagaStore.retry}
                classList={{ hidden: !canRetry() }}
              >
                <RefreshCw size={20} />
              </Button>
            </Show>
          </Show>

          <Show when={edit()}>
            <Button size="pill" schema="success" onClick={save}>
              Save
            </Button>
            <Button size="pill" schema="error" onClick={() => setEdit(false)}>
              Cancel
            </Button>
          </Show>
        </div>
      </div>
    </>
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
