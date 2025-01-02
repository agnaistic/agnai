import './Message.css'
import * as Purify from 'dompurify'
import {
  Check,
  DownloadCloud,
  Info,
  PauseCircle,
  Pencil,
  PlusCircle,
  RefreshCw,
  Repeat1,
  Terminal,
  Trash,
  Delete,
  X,
  Zap,
  Split,
  MoreHorizontal,
  Braces,
} from 'lucide-solid'
import {
  Accessor,
  Component,
  createMemo,
  createSignal,
  For,
  JSX,
  Match,
  onCleanup,
  onMount,
  Show,
  Signal,
  Switch,
} from 'solid-js'
import { BOT_REPLACE, SELF_REPLACE } from '../../../../common/prompt'
import { AppSchema } from '../../../../common/types/schema'
import AvatarIcon, { CharacterAvatar } from '../../../shared/AvatarIcon'
import { getAssetUrl } from '../../../shared/util'
import {
  chatStore,
  userStore,
  msgStore,
  settingStore,
  toastStore,
  ChatState,
  VoiceState,
} from '../../../store'
import { markdown } from '../../../shared/markdown'
import Button, { ButtonSchema } from '/web/shared/Button'
import { rootModalStore } from '/web/store/root-modal'
import { ContextState, useAppContext } from '/web/store/context'
import { hydrateTemplate, trimSentence } from '/common/util'
import { EVENTS, events } from '/web/emitter'
import TextInput from '/web/shared/TextInput'
import { Card, Pill } from '/web/shared/Card'
import { FeatureFlags } from '/web/store/flags'
import { DropMenu } from '/web/shared/DropMenu'
import { ChatTree } from '/common/chat'
import { Portal } from 'solid-js/web'
import { UI } from '/common/types'
import { LucideProps } from 'lucide-solid/dist/types/types'
import { createStore } from 'solid-js/store'
import { Spinner } from '/web/shared/Loading'
import { LogProbs } from './LogProbs'

type MessageProps = {
  msg: SplitMessage
  last?: boolean
  swipe?: string | false
  confirmSwipe?: () => void
  cancelSwipe?: () => void
  discardSwipe?: () => void
  onRemove: () => void
  editing: boolean
  tts?: boolean
  children?: any
  retrying?: AppSchema.ChatMessage
  partial?: string
  sendMessage: (msg: string, ooc: boolean) => void
  isPaneOpen: boolean
  showHiddenEvents?: boolean
  textBeforeGenMore?: string
  voice?: VoiceState
  firstInserted?: boolean
  index: number
}

const anonNames = new Map<string, number>()

let anonId = 0

function getAnonName(entityId: string) {
  if (!anonNames.has(entityId)) {
    anonNames.set(entityId, ++anonId)
  }

  const id = anonNames.get(entityId)
  return `User ${id}`
}

const Message: Component<MessageProps> = (props) => {
  let editRef: HTMLDivElement
  let avatarRef: any

  const [ctx] = useAppContext()
  const user = userStore()
  const state = chatStore()
  const [edit, setEdit] = createSignal(false)
  const isBot = !!props.msg.characterId
  const isUser = !!props.msg.userId
  const [img, setImg] = createSignal('h-full')
  const opts = createSignal(false)
  const [jsonValues, setJsonValues] = createSignal(props.msg.json?.values || {})

  const showOpt = createSignal(false)

  const [obs] = createSignal(
    new ResizeObserver(() => {
      setImg(`calc(${Math.min(avatarRef?.clientHeight, 10000)}px + 1em)`)
    })
  )

  onMount(() => obs().observe(avatarRef))
  onCleanup(() => obs().disconnect())

  const format = createMemo(() => ({ size: user.ui.avatarSize, corners: user.ui.avatarCorners }))
  const content = createMemo(() => {
    const msgV2 = getMessageContent(ctx, props, state)
    return msgV2
  })

  const saveEdit = () => {
    if (props.msg.json) {
      const json = jsonValues()
      const update = getJsonUpdate(
        ctx.preset?.jsonSource === 'character'
          ? ctx.activeMap[props.msg.characterId!]?.json
          : ctx.preset?.json,
        json
      )

      if (update) {
        msgStore.editMessageProp(props.msg._id, update)
      }

      setEdit(false)
      return
    }

    if (!editRef) return

    msgStore.editMessage(props.msg._id, editRef.innerText)
    setEdit(false)
  }

  const cancelEdit = () => setEdit(false)

  const startEdit = () => {
    setEdit(true)
    if (editRef) {
      editRef.innerText = props.msg.msg
    }
    editRef?.focus()
  }

  const alt = createMemo(() => {
    const percent = `${ctx.ui.chatAlternating ?? 0}%`
    return {
      width: `calc(100% - ${ctx.ui.chatAlternating ?? 0}%)`,
      'margin-right': ctx.user?._id === props.msg.userId ? percent : undefined,
      'margin-left': ctx.user?._id !== props.msg.userId ? percent : undefined,
    }
  })

  return (
    <div
      class={'flex w-full rounded-md px-2 py-2 pr-2 sm:px-4'}
      data-sender={props.msg.characterId ? 'bot' : 'user'}
      data-bot={props.msg.characterId ? ctx.char?.name : ''}
      data-user={props.msg.userId ? state.memberIds[props.msg.userId]?.handle : props.msg.name}
      data-last={props.last?.toString()}
      data-lastsplit="true"
      style={true ? {} : alt()}
      classList={{
        'bg-chat-bot': !props.msg.ooc && !props.msg.userId,
        'bg-chat-user': !props.msg.ooc && !!props.msg.userId,
        'bg-chat-ooc': !!props.msg.ooc,
        unblur: showOpt[0](),
      }}
    >
      <div class={`flex w-full`} classList={{ 'opacity-50': !!props.msg.ooc }}>
        <div class={`flex h-fit w-full select-text flex-col gap-1`}>
          <div class="break-words">
            <span
              class={`float-left pr-3`}
              style={{ 'min-height': user.ui.imageWrap ? '' : img() }}
              data-bot-avatar={isBot}
              data-user-avatar={isUser}
            >
              <Switch>
                <Match when={user.ui.avatarSize === 'hide'}>{null}</Match>
                <Match when={props.msg.event === 'world' || props.msg.event === 'ooc'}>
                  <div
                    class={`avatar-${format().size} flex shrink-0 items-center justify-center pt-3`}
                  >
                    <Zap />
                  </div>
                </Match>

                <Match when={props.voice === 'generating'}>
                  <div class="animate-pulse cursor-pointer" onClick={msgStore.stopSpeech}>
                    <AvatarIcon format={format()} Icon={DownloadCloud} />
                  </div>
                </Match>

                <Match when={props.voice === 'playing'}>
                  <div class="animate-pulse cursor-pointer" onClick={msgStore.stopSpeech}>
                    <AvatarIcon format={format()} Icon={PauseCircle} />
                  </div>
                </Match>

                <Match when={ctx.allBots[props.msg.characterId!]}>
                  <CharacterAvatar
                    char={ctx.allBots[props.msg.characterId!]}
                    format={format()}
                    openable
                    bot
                    zoom={1.75}
                  />
                </Match>

                <Match when={!props.msg.characterId}>
                  <AvatarIcon
                    format={format()}
                    Icon={DownloadCloud}
                    avatarUrl={state.memberIds[props.msg.userId!]?.avatar}
                    anonymize={ctx.anonymize}
                  />
                </Match>

                <Match when>
                  <AvatarIcon
                    format={format()}
                    Icon={DownloadCloud}
                    avatarUrl={state.memberIds[props.msg.userId!]?.avatar}
                    anonymize={ctx.anonymize}
                  />
                </Match>
              </Switch>
            </span>
            <span class="flex flex-row justify-between pb-1">
              <span
                class={`flex min-w-0 shrink flex-col items-start gap-1 overflow-hidden`}
                classList={{
                  'sm:flex-col': props.isPaneOpen,
                  'sm:gap-1': props.isPaneOpen,
                  'sm:flex-row': !props.isPaneOpen,
                  'sm:gap-0': !props.isPaneOpen,
                  'sm:items-end': !props.isPaneOpen,
                  italic: props.msg.ooc,
                }}
              >
                <b
                  class={`chat-name text-900 mr-2 max-w-[160px] overflow-hidden  text-ellipsis whitespace-nowrap sm:max-w-[400px]`}
                  // Necessary to override text-md and text-lg's line height, for proper alignment
                  style="line-height: 1;"
                  data-bot-name={isBot}
                  data-user-name={isUser}
                  classList={{
                    hidden: !!props.msg.event,
                    'sm:text-base': props.isPaneOpen,
                    'sm:text-lg': !props.isPaneOpen,
                  }}
                >
                  {ctx.anonymize && !props.msg.characterId
                    ? getAnonName(props.msg.userId!)
                    : props.msg.handle}
                </b>

                <span
                  classList={{ invisible: ctx.anonymize }}
                  class={`message-date text-600 flex items-center text-xs leading-none`}
                  data-bot-time={isBot}
                  data-user-time={isUser}
                >
                  {new Date(props.msg.createdAt).toLocaleString()}
                  <Show when={ctx.flags.debug}>
                    <tr>
                      <td class="pr-2">
                        <b>id</b>
                      </td>
                      <td>
                        id:{props.msg._id.slice(0, 4)} up:{props.msg.parent?.slice(0, 4)}
                      </td>
                    </tr>
                  </Show>
                  <Show
                    when={
                      ctx.flags.debug || canShowMeta(props.msg, ctx.promptHistory[props.msg._id])
                    }
                  >
                    <span
                      class="text-600 hover:text-900 ml-1 cursor-pointer"
                      onClick={() =>
                        rootModalStore.info(
                          'Message Information',
                          <Meta
                            msg={props.msg}
                            history={ctx.promptHistory[props.msg._id]}
                            flags={ctx.flags}
                            tree={ctx.chatTree}
                          />
                        )
                      }
                    >
                      <Info size={14} />
                    </span>
                  </Show>
                </span>
              </span>
              <Switch>
                <Match
                  when={
                    !edit() &&
                    !props.swipe &&
                    user.user?._id === ctx.chat?.userId &&
                    ctx.chat?.mode !== 'companion'
                  }
                >
                  <MessageOptions
                    index={props.index}
                    ui={user.ui}
                    msg={props.msg}
                    edit={edit}
                    startEdit={startEdit}
                    onRemove={props.onRemove}
                    last={props.last}
                    tts={!!props.tts}
                    partial={props.partial}
                    show={opts}
                    showMore={showOpt}
                    textBeforeGenMore={props.textBeforeGenMore}
                  />
                </Match>

                <Match when={edit()}>
                  <div class="cancel-edit-btn mr-4 flex items-center gap-4 text-sm">
                    <div class="icon-button text-red-500" onClick={cancelEdit}>
                      <X size={22} />
                    </div>
                    <div class="confirm-edit-btn icon-button text-green-500" onClick={saveEdit}>
                      <Check size={22} />
                    </div>
                  </div>
                </Match>

                <Match when={props.last && props.swipe}>
                  <div class="mr-4 flex items-center gap-4 text-sm">
                    <div
                      class="icon-button text-red-500"
                      onClick={props.discardSwipe}
                      title="Discard"
                    >
                      <Delete size={22} />
                    </div>
                    <div
                      class="icon-button text-red-500"
                      onClick={props.cancelSwipe}
                      title="Cancel"
                    >
                      <X size={22} />
                    </div>
                    <div
                      class="icon-button text-green-500"
                      onClick={props.confirmSwipe}
                      title="Select"
                    >
                      <Check size={22} />
                    </div>
                  </div>
                </Match>
              </Switch>
            </span>
            <div ref={avatarRef} classList={{ 'overflow-hidden': !user.ui.imageWrap }}>
              <Switch>
                <Match when={props.msg.adapter === 'image'}>
                  <div class="flex flex-wrap gap-2">
                    <img
                      class={'mt-2 max-h-32 max-w-[unset] cursor-pointer rounded-md'}
                      src={getAssetUrl(props.msg.msg)}
                      onClick={() =>
                        settingStore.showImage(props.msg.msg, [
                          toImageDeleteButton(props.msg._id, 0),
                        ])
                      }
                    />
                    <For each={props.msg.extras || []}>
                      {(src, i) => (
                        <img
                          class={'mt-2 max-h-32 max-w-[unset] cursor-pointer rounded-md'}
                          src={getAssetUrl(src)}
                          onClick={() =>
                            settingStore.showImage(src, [
                              toImageDeleteButton(props.msg._id, i() + 1),
                            ])
                          }
                        />
                      )}
                    </For>
                    <div
                      class="icon-button mx-2 flex items-center"
                      onClick={() => msgStore.createImage(props.msg._id, true)}
                    >
                      <PlusCircle size={20} />
                    </div>
                  </div>
                </Match>
                <Match when={!edit() && content().type === 'message'}>
                  <p
                    class={`rendered-markdown pr-1 ${content().class}`}
                    data-bot-message={!props.msg.userId}
                    data-user-message={!!props.msg.userId}
                    innerHTML={content().message}
                  />
                  <Show when={props.msg.adapter === 'partial-response' && props.last}>
                    <span class="flex h-8 w-12 items-center justify-center">
                      <span class="dot-flashing bg-[var(--hl-700)]"></span>
                    </span>
                  </Show>
                  <Show when={!props.partial && props.last}>
                    <div class="flex items-center justify-center gap-2">
                      <For each={props.msg.actions}>
                        {(item) => (
                          <Button
                            size="sm"
                            schema="gray"
                            onClick={() => sendAction(props.sendMessage, item)}
                          >
                            {item.emote}
                          </Button>
                        )}
                      </For>
                    </div>
                  </Show>
                </Match>
                <Match when={!edit() && content().type !== 'message'}>
                  <p
                    classList={{ hidden: content().type === 'waiting' }}
                    class={`rendered-markdown pr-1 ${content().class}`}
                    data-bot-message={!props.msg.userId}
                    data-user-message={!!props.msg.userId}
                    innerHTML={content().message}
                  />
                  <Show
                    when={ctx.waiting?.image}
                    fallback={
                      <div class="flex h-8 w-12 items-center justify-center">
                        <div class="dot-flashing bg-[var(--hl-700)]"></div>
                      </div>
                    }
                  >
                    <Spinner />{' '}
                    <span
                      class="text-500 text-xs italic"
                      classList={{ hidden: !ctx.status?.wait_time }}
                    >
                      {ctx.status?.wait_time || '0'}s
                    </span>
                  </Show>
                </Match>
                <Match when={edit() && props.msg.json}>
                  <JsonEdit msg={props.msg} update={(next) => setJsonValues(next)} />
                </Match>
                <Match when={edit()}>
                  <div
                    class="msg-edit-text-box"
                    ref={editRef!}
                    contentEditable={true}
                    onKeyUp={(ev) => {
                      if (ev.key === 'Escape') cancelEdit()
                      if (ev.altKey && ev.key === 's') {
                        ev.preventDefault()
                        saveEdit()
                      }
                    }}
                  ></div>
                </Match>
              </Switch>
            </div>
          </div>
          <Show when={!edit()}>{props.last && props.children}</Show>
        </div>
      </div>
    </div>
  )
}

export default Message

export type SplitMessage = AppSchema.ChatMessage & { split?: boolean; handle?: string }

function anonymizeText(text: string, profile: AppSchema.Profile, i: number) {
  return text.replace(new RegExp(profile.handle.trim(), 'gi'), 'User ' + (i + 1))
}

const JsonEdit: Component<{ msg: SplitMessage; update: (next: any) => void }> = (props) => {
  const entries = createMemo(() => Object.keys(props.msg.json?.values || {}))
  const [editing, setEditing] = createStore<Record<string, string>>(props.msg.json?.values || {})

  onMount(() => {
    props.update(props.msg.json?.values || {})
  })

  return (
    <div class="flex flex-col gap-2">
      <For each={entries()}>
        {(key) => (
          <div class="flex flex-col">
            <Pill type="bg" small opacity={0.5} class="rounded-b-none rounded-t-md">
              {key}
            </Pill>
            <div
              ref={(r) => (r.innerText = editing[key])}
              class="msg-edit-text-box rounded-md rounded-tl-none border border-[var(--bg-500)] p-1"
              contentEditable={true}
              onKeyUp={(ev: any) => {
                setEditing(key, ev.target.innerText)
                props.update(editing)
              }}
            ></div>
          </div>
        )}
      </For>
    </div>
  )
}

const MessageOptions: Component<{
  index: number
  msg: SplitMessage
  ui: UI.UISettings
  tts: boolean
  edit: Accessor<boolean>
  startEdit: () => void
  last?: boolean
  partial?: string
  show: Signal<boolean>
  textBeforeGenMore?: string
  onRemove: () => void
  showMore: Signal<boolean>
}> = (props) => {
  const closer = (action: () => void) => {
    return () => {
      action()
      props.showMore[1](false)
    }
  }

  const open = createMemo(() => props.showMore[0]())

  const logic = createMemo(() => {
    const items: Record<
      UI.MessageOption,
      {
        key: UI.MessageOption
        outer: { outer: boolean; pos: number }
        label: string
        class: string
        onClick: () => void
        show: boolean
        schema?: ButtonSchema
        icon: (props: LucideProps) => JSX.Element
      }
    > = {
      prompt: {
        key: 'prompt',
        label: 'Prompt',
        class: 'prompt-btn',
        outer: props.ui.msgOptsInline.prompt,
        show: !!props.msg.characterId && props.msg.adapter !== 'image',
        onClick: () => !props.partial && chatStore.computePrompt(props.msg, true),
        icon: Terminal,
      },

      edit: {
        key: 'edit',
        label: 'Edit',
        class: 'edit-btn',
        outer: props.ui.msgOptsInline.edit,
        show: props.msg.adapter !== 'image',
        onClick: props.startEdit,
        icon: Pencil,
      },

      fork: {
        key: 'fork',
        label: 'Fork',
        class: 'fork-btn',
        show: !props.last,
        outer: props.ui.msgOptsInline.fork,
        onClick: () => !props.partial && msgStore.fork(props.msg._id),
        icon: Split,
      },

      regen: {
        key: 'regen',
        class: 'refresh-btn',
        label: 'Regenerate',
        outer: props.ui.msgOptsInline.regen,
        show:
          (props.last || (props.msg.adapter === 'image' && !!props.msg.imagePrompt)) &&
          !!props.msg.characterId,
        onClick: () => !props.partial && retryMessage(props.msg, props.msg),
        icon: RefreshCw,
      },

      'schema-regen': {
        key: 'schema-regen',
        class: 'refresh-btn',
        label: 'Schema Regen',
        outer: props.ui.msgOptsInline['schema-regen'],
        show:
          window.flags.reschema &&
          ((props.msg.json && props.last) ||
            (props.msg.adapter === 'image' && !!props.msg.imagePrompt)) &&
          !!props.msg.characterId,
        onClick: () => !props.partial && retryJsonSchema(props.msg, props.msg),
        icon: Braces,
      },

      trash: {
        key: 'trash',
        label: 'Delete',
        show: true,
        outer: props.ui.msgOptsInline.trash,
        onClick: props.onRemove,
        class: 'delete-btn',
        schema: 'red',
        icon: Trash,
      },
    }

    return items
  })

  const showInner = createMemo(() => {
    const logics = logic()
    for (const opt of Object.values(logics)) {
      if (!opt.outer.outer && opt.show) return true
    }

    return false
  })

  const order = createMemo(() => {
    open()
    logic()

    return Object.entries(props.ui.msgOptsInline)
      .sort((l, r) => l[1].pos - r[1].pos)
      .map(([key, item]) => ({ key: key as UI.MessageOption, ...item }))
  })

  return (
    <div class="mr-3 flex items-center gap-4 text-sm">
      <div class="contents" id={`outer-${props.msg._id}`}></div>

      <For each={order()}>
        {(item) => {
          const def = logic()[item.key]

          return (
            <MessageOption
              id={props.msg._id}
              outer={def.outer.outer}
              show={def.show}
              label={def.label}
              open={open()}
              onClick={closer(def.onClick)}
              class={def.class}
              schema={def.schema}
            >
              {def.icon({ size: 18 })}
            </MessageOption>
          )
        }}
      </For>

      <div
        class="flex items-center"
        classList={{ 'tour-message-opts': props.index === 0, hidden: !showInner() }}
        onClick={() => props.showMore[1](true)}
      >
        <MoreHorizontal class="icon-button" />
      </div>

      <Show when={showInner()}>
        <DropMenu
          class="p-1"
          horz="left"
          vert="down"
          show={open()}
          close={() => props.showMore[1](false)}
        >
          <div class="flex flex-col gap-1" id={`inner-${props.msg._id}`}></div>
        </DropMenu>
      </Show>
      <Show
        when={
          (props.last || (props.msg.adapter === 'image' && props.msg.imagePrompt)) &&
          props.msg.characterId &&
          !!props.textBeforeGenMore
        }
      >
        <div
          class="icon-button"
          onClick={() => !props.partial && msgStore.continuation(props.msg.chatId, undefined, true)}
        >
          <Repeat1 size={18} />
        </div>
      </Show>

      <Show when={props.last && !props.msg.characterId}>
        <div
          class="icon-button"
          onClick={() => !props.partial && msgStore.resend(props.msg.chatId, props.msg._id)}
        >
          <RefreshCw size={18} />
        </div>
      </Show>
    </div>
  )
}

const MessageOption: Component<{
  schema?: ButtonSchema
  class?: string
  id: string
  open: boolean | undefined
  show: boolean | undefined
  outer: boolean
  onClick: () => void
  label: string
  children: any
}> = (props) => {
  const show = createMemo(() => (!props.outer && props.open) || props.outer)

  return (
    <Show when={props.show && show()}>
      <Portal mount={document.querySelector(`#${props.outer ? 'outer' : 'inner'}-${props.id}`)!}>
        <Show when={props.outer}>
          <div class={`icon-button ${props.class || ''}`} onClick={props.onClick}>
            {props.children}
          </div>
        </Show>

        <Show when={!props.outer}>
          <Button
            class={`${props.class || ''} w-full min-w-max`}
            schema={props.schema || 'secondary'}
            onClick={props.onClick}
            size="sm"
            alignLeft
          >
            {props.children} {props.label}
          </Button>
        </Show>
      </Portal>
    </Show>
  )
}

function retryMessage(original: AppSchema.ChatMessage, split: SplitMessage) {
  if (original.adapter !== 'image') {
    msgStore.retry(split.chatId, original._id)
  } else {
    msgStore.createImage(split._id)
  }
}

function retryJsonSchema(original: AppSchema.ChatMessage, split: SplitMessage) {
  msgStore.retrySchema(split.chatId, original._id)
}

function renderMessage(ctx: ContextState, text: string, isUser: boolean, adapter?: string) {
  // Address unfortunate Showdown bug where spaces in code blocks are replaced with nbsp, except
  // it also encodes the ampersand, which results in them actually being rendered as `&amp;nbsp;`
  // https://github.com/showdownjs/showdown/issues/669

  const html = Purify.sanitize(
    wrapWithQuoteElement(
      markdown.makeHtml(parseMessage(text, ctx, isUser, adapter)).replace(/&amp;nbsp;/g, '&nbsp;')
    )
  )

  return html
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

function sendAction(_send: MessageProps['sendMessage'], { emote, action }: AppSchema.ChatAction) {
  events.emit(EVENTS.setInputText, action)
}

function parseMessage(msg: string, ctx: ContextState, isUser: boolean, adapter?: string) {
  if (adapter === 'image') {
    return msg.replace(BOT_REPLACE, ctx.char?.name || '').replace(SELF_REPLACE, ctx.handle)
  }

  const parsed = msg.replace(BOT_REPLACE, ctx.char?.name || '').replace(SELF_REPLACE, ctx.handle)
  return parsed
}

const Meta: Component<{
  msg: AppSchema.ChatMessage
  history?: any
  flags: FeatureFlags
  tree: ChatTree
}> = (props) => {
  if (!props.msg) return null
  const [prompt, setPrompt] = createSignal(props.msg?.imagePrompt || '')

  const updateImagePrompt = () => {
    msgStore.editMessageProp(props.msg._id, { imagePrompt: prompt() }, () => {
      toastStore.success('Image prompt updated')
    })
  }

  const descendants = createMemo(() => {
    const self = props.tree[props.msg._id]
    if (!self) return []

    return Array.from(self.children.values())
  })

  const depth = props.tree[props.msg._id]?.depth || -1

  return (
    <form class="flex w-full flex-col gap-2">
      <Card>
        <LogProbs msg={props.msg} />
        <table class="text-sm">
          <Show when={props.msg.adapter}>
            <tr>
              <td class="pr-2">
                <b>Adapter</b>
              </td>
              <td>{props.msg.adapter}</td>
            </tr>
          </Show>
          <Show when={depth >= 0}>
            <tr>
              <td>
                <b>depth</b>
              </td>
              <td>#{depth + 1}</td>
            </tr>
          </Show>
          <Show when={descendants().length > 0 && props.flags.debug}>
            <tr>
              <td>
                <b>descendants</b>
              </td>
              <td>
                {descendants()
                  .map((d) => d.slice(0, 4))
                  .join(', ')}
              </td>
            </tr>
          </Show>
          <For each={Object.entries(props.msg.meta || {}).filter(([key]) => key !== 'probs')}>
            {([key, value]) => (
              <tr>
                <td class="pr-2">
                  <b>{key}</b>
                </td>
                <td>{value as string}</td>
              </tr>
            )}
          </For>
        </table>
      </Card>

      <Show when={props.msg.imagePrompt}>
        <Card>
          <TextInput
            helperText={
              <>
                Image Prompt -{' '}
                <span class="link" onClick={updateImagePrompt}>
                  Save
                </span>
              </>
            }
            parentClass="text-sm"
            isMultiline
            value={prompt()}
            onChange={(ev) => setPrompt(ev.currentTarget.value)}
          />
        </Card>
      </Show>

      <Show when={props.history}>
        <pre class="overflow-x-auto whitespace-pre-wrap break-words rounded-sm bg-[var(--bg-700)] p-1 text-sm">
          <Show
            when={typeof props.history === 'string'}
            fallback={JSON.stringify(props.history, null, 2)}
          >
            {props.history}
          </Show>
        </pre>
      </Show>
    </form>
  )
}

function canShowMeta(msg: AppSchema.ChatMessage, history: any) {
  if (!msg) return false
  if (msg._id === 'partial-response') return false
  return !!msg.adapter || !!history || (!!msg.meta && Object.keys(msg.meta).length >= 1)
}

function toImageDeleteButton(msgId: string, position: number) {
  return {
    schema: 'red' as const,
    text: 'Delete Image',
    onClick: () => {
      msgStore.removeMessageImage(msgId, position)
      settingStore.clearImage()
    },
  }
}

function getMessageContent(ctx: ContextState, props: MessageProps, state: ChatState) {
  const isRetry = props.retrying?._id === props.msg._id
  const isPartial = props.msg._id === 'partial-response'

  if (isRetry || isPartial) {
    if (props.partial) {
      return {
        type: 'partial',
        message: renderMessage(ctx, props.partial!, false, 'partial'),
        class: 'streaming-markdown',
      }
    }

    if (isPartial && props.msg.msg) {
      return {
        type: 'partial',
        message: renderMessage(ctx, props.msg.msg, false, 'partial'),
        class: 'streaming-markdown',
      }
    }

    return { type: 'waiting', message: '', class: 'not-streaming' }
  }

  let message = props.msg.msg

  if (props.last && props.swipe) message = props.swipe
  if (props.msg.event && !props.showHiddenEvents) {
    message = message.replace(/\(OOC:.+\)/, '')
  }

  if (ctx.anonymize) {
    message = state.chatProfiles.reduce(anonymizeText, message).replace(SELF_REPLACE, 'User #1')
  }

  if (ctx.trimSentences && !props.msg.userId) {
    message = trimSentence(message)
  }

  return {
    type: 'message',
    message: renderMessage(ctx, message, !!props.msg.userId, props.msg.adapter),
    class: 'not-streaming',
  }
}

function getJsonUpdate(def: AppSchema.Character['json'], json: any) {
  if (!def) return
  const hydration = hydrateTemplate(def, json)

  return {
    json: hydration,
    msg: hydration.response,
  }
}
