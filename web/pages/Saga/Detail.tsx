import * as Purify from 'dompurify'
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
  onCleanup,
  onMount,
} from 'solid-js'
import { ModeDetail } from '/web/shared/Mode/Detail'
import { SagaInput } from './Input'
import { SidePane } from './Pane'
import Button from '/web/shared/Button'
import { formatResponse, sagaStore } from './state'
import { markdown } from '/web/shared/markdown'
import Modal from '/web/shared/Modal'
import { GuidanceHelp } from './Help'
import {
  Cog,
  HelpCircle,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Sliders,
  Trash,
} from 'lucide-solid'
import { useNavigate, useParams, useSearchParams } from '@solidjs/router'
import { ImportTemplate } from './ImportModal'
import Loading from '/web/shared/Loading'
import { DropMenu } from '/web/shared/DropMenu'
import { createStore } from 'solid-js/store'
import { Pill } from '/web/shared/Card'
import { getTemplateFields, toSessionUrl } from './util'
import { SessionList } from './List'
import { toastStore, userStore } from '/web/store'
import { Saga } from '/common/types'
import { getRgbaFromVar } from '/web/shared/colors'
import { trimSentence } from '/common/util'
import { getHeaderBg, sticky } from '/web/shared/util'

export const SagaDetail: Component = (props) => {
  const user = userStore()
  const state = sagaStore((s) => {
    const responses = s.state.responses.map((res) => trimResponse(res, user.ui.trimSentences))
    const init = s.state.init ? trimResponse(s.state.init, user.ui.trimSentences) : undefined

    return {
      ...s,
      responses,
      init,
    }
  })

  const ui = createMemo(() => {
    const alt = `${user.ui.chatAlternating ?? 0}%`
    return {
      response: {
        ...getRgbaFromVar(user.current.botBackground || 'bg-800', user.ui.msgOpacity),
        width: `calc(100% - ${alt})`,
        'margin-left': alt,
      },
      input: {
        ...getRgbaFromVar(user.current.msgBackground || 'bg-800', user.ui.msgOpacity),
        width: `calc(100% - ${alt}%)`,
        'margin-right': alt,
      },
    }
  })

  const params = useParams()
  const [search, setSearch] = useSearchParams()

  const [load, setLoad] = createSignal(false)
  const [pane, setPane] = createSignal(false)
  const [stage, setStage] = createSignal<'ready' | 'rendering' | 'done'>('ready')

  onMount(() => {
    sagaStore.init(params.id)
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

  const headerImage = createMemo(() => {
    if (!state.template.imagesEnabled) return null
    const src = state.image.data
    const stage = state.image.state
    if (!src) {
      if (stage !== 'generating') return null

      return (
        <div class="relative flex h-full w-full justify-center">
          {/* <img src={src} class="h-full" /> */}
          <div class="bg-700 t h-full w-3/4 bg-gradient-to-r from-[var(--bg-800)] via-slate-700 to-[var(--bg-800)]">
            &nbsp;
          </div>

          <div
            class="spinner absolute bottom-1/2 left-1/2"
            classList={{ hidden: stage !== 'generating' }}
          >
            <LoaderCircle />
          </div>
        </div>
      )
    }

    return (
      <div class="relative h-full">
        <img src={src} class="h-full" />

        <div
          class="spinner absolute bottom-1/2 left-1/2"
          classList={{ hidden: stage !== 'generating' }}
        >
          <LoaderCircle />
        </div>
      </div>
    )
  })

  const sendMessage = (text: string, done?: () => void) => {
    sagaStore.send(text, (err) => {
      if (err) return
      done?.()
    })
  }

  onCleanup(sticky.clear)

  return (
    <>
      <ModeDetail
        loading={false}
        header={<Header template={state.template} session={state.state} />}
        footer={
          <Footer load={() => setLoad(true)} send={sendMessage} rendering={state.image.loading} />
        }
        showPane={pane()}
        pane={<SidePane show={setPane} />}
        split={headerImage()}
        splitHeight={user.ui.viewHeight ?? 30}
      >
        <section class="flex flex-col gap-2" ref={sticky.monitor}>
          <Show when={!!state.init}>
            <Response
              template={state.template}
              type="intro"
              msg={state.init!}
              session={state.state}
              ui={ui()}
              busy={state.busy}
            />
          </Show>

          <Index each={state.responses}>
            {(res, i) => (
              <>
                <Response
                  template={state.template}
                  type="input"
                  msg={res()}
                  session={state.state}
                  index={i}
                  ui={ui()}
                  busy={state.busy}
                />
                <Response
                  template={state.template}
                  type="response"
                  msg={res()}
                  session={state.state}
                  siblings={state.state.responses.length}
                  index={i}
                  ui={ui()}
                  busy={state.busy}
                >
                  <Show when={state.busy && i === state.state.responses.length - 1}>
                    <Loading type="flashing" />
                  </Show>
                </Response>
              </>
            )}
          </Index>
        </section>
      </ModeDetail>
      <Show when={load()}>
        <LoadModal close={() => setLoad(false)} />
      </Show>
      <GuidanceHelp />
      <Switch>
        <Match when={state.showModal === 'import'}>
          <ImportTemplate />
        </Match>
      </Switch>
    </>
  )
}

const LoadModal: Component<{ close: () => void }> = (props) => {
  return (
    <Modal maxWidth="half" show close={props.close}>
      <div class="flex flex-col gap-1">
        <SessionList onSession={props.close} />
      </div>
    </Modal>
  )
}

const Header: Component<{ template: Saga.Template; session: Saga.Session }> = (props) => {
  const user = userStore()
  const header = createMemo(() => getHeaderBg(user.ui.mode))
  const [_, setParams] = useSearchParams()
  return (
    <div class="hidden items-center justify-between rounded-md sm:flex" style={header()}>
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
    </div>
  )
}

const Footer: Component<{
  load: () => void
  send: (text: string, onSuccess?: () => void) => void
  rendering: boolean
}> = (props) => {
  const state = sagaStore()
  const params = useParams()
  const nav = useNavigate()

  const onSave = (session: Saga.Session) => {
    toastStore.success('Session saved')
    if (session._id !== params.id) {
      nav(toSessionUrl(session._id))
    }
  }

  return (
    <div class="flex flex-col gap-2">
      <div class="flex gap-2">
        <Button size="pill" disabled={state.busy} onClick={() => sagaStore.start()}>
          {state.state.init ? 'Restart' : 'Start'}
        </Button>
        <Show when={state.state.init}>
          <Button
            size="pill"
            onClick={() => sagaStore.newSession(state.template._id, (id) => nav(toSessionUrl(id)))}
          >
            New
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
          <Button
            size="pill"
            onClick={() => sagaStore.generateImage(false)}
            disabled={state.busy || props.rendering}
          >
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
  template: Saga.Template
  session: Saga.Session
  ui: Record<string, JSX.CSSProperties>
  type: 'input' | 'response' | 'intro'
  siblings?: number
  msg: Record<string, any>
  index?: number
  children?: any
  busy: boolean
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

  const fields = createMemo(() => getTemplateFields(props.type, props.template, props.msg))

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

  const content = createMemo(() => renderMessage(text()))

  return (
    <>
      <div
        class="rendered-markdown flex flex-col gap-1 rounded-md px-2 py-[6px]"
        style={{ ...(props.ui[props.type] || props.ui.response) }}
      >
        <div class="flex justify-between gap-1 py-1">
          <div>
            <Show when={canRetry() && !!props.children}>{props.children}</Show>
          </div>
          <div class="flex items-end justify-end gap-1">
            <Show when={!edit()}>
              <Button size="pill" schema="icon" onClick={startEdit} disabled={props.busy}>
                <Pencil size={16} />
              </Button>

              <Show when={props.type === 'response'}>
                <Button
                  size="pill"
                  schema="icon"
                  onClick={() => sagaStore.deleteResponse(props.index!)}
                >
                  <Trash size={16} />
                </Button>
                <Button
                  size="pill"
                  schema="icon"
                  onClick={() => sagaStore.retry()}
                  classList={{ hidden: !canRetry() }}
                  disabled={props.busy}
                >
                  <RefreshCw class="icon-button" size={16} />
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
        <Show when={!edit()}>
          <div innerHTML={content()} />
        </Show>
        <Show when={edit()}>
          <div class="flex flex-col gap-1">
            <For each={fields()}>
              {(field) => (
                <div class="bg-700 rounded-md p-1 text-sm">
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

function renderMessage(msg: string) {
  return Purify.sanitize(
    wrapWithQuoteElement(markdown.makeHtml(msg).replace(/&amp;nbsp;/g, '&nbsp;'))
  )
}

function wrapWithQuoteElement(str: string) {
  return str.replace(
    // we first match code blocks AND html tags
    // to ensure we do NOTHING to what's inside them
    // then we match "regular quotes" and“'pretty quotes” as capture group
    /<[\s\S]*?>|```[\s\S]*?```|``[\s\S]*?``|`[\s\S]*?`|(\".+?\")|(\u201C.+?\u201D)/gm,
    wrapCaptureGroups
  )
}

/** For use as a String#replace(str, cb) callback */
function wrapCaptureGroups(
  match: string,
  regularQuoted?: string /** regex capture group 1 */,
  curlyQuoted?: string /** regex capture group 2 */
) {
  if (regularQuoted) {
    return '<q>"' + regularQuoted.replace(/\"/g, '') + '"</q>'
  } else if (curlyQuoted) {
    return '<q>“' + curlyQuoted.replace(/\u201C|\u201D/g, '') + '”</q>'
  } else {
    return match
  }
}

function trimResponse(res: Record<string, any>, trim?: boolean) {
  if (!trim) return res

  const next = Object.assign({}, res)

  for (const [key, value] of Object.entries(res)) {
    next[key] = typeof value === 'string' ? trimSentence(value) : value
  }

  return next
}
