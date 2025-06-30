import './Message.css'
import Purify from 'dompurify'
import {
  Check,
  DownloadCloud,
  Info,
  PauseCircle,
  Pencil,
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
  ImagePlus,
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
import { chatStore, userStore, msgStore, ChatState, VoiceState, settingStore } from '../../../store'
import { markdown } from '../../../shared/markdown'
import Button, { ButtonSchema } from '/web/shared/Button'
import { ContextState, useAppContext } from '/web/store/context'
import { hydrateTemplate, trimSentence } from '/common/util'
import { EVENTS, events } from '/web/emitter'
import { Pill } from '/web/shared/Card'
import { DropMenu } from '/web/shared/DropMenu'
import { Portal } from 'solid-js/web'
import { UI } from '/common/types'
import { LucideProps } from 'lucide-solid/dist/types/types'
import { createStore } from 'solid-js/store'
import { RelativeSpinner } from '/web/shared/Loading'
import { MessageImages } from './MessageImages'
import Select from '/web/shared/Select'
import { FileInputResult, getFileAsDataURL } from '/web/shared/FileInput'
import { resizeImage } from '/web/shared/image-resize'
import { MsgAttachment } from '/srv/adapter/type'
import { ALLOWED_TYPES } from '/web/store/data/image'
import { MessageAttachments } from './Attachments'

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
  let editRef: HTMLDivElement | undefined
  let avatarRef: any

  const [ctx] = useAppContext()
  const user = userStore()
  const state = chatStore()
  const [edit, setEdit] = createSignal(false)
  const [editSender, setEditSender] = createSignal<string>()
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
    const senderJson = editSender()
    const sender = senderJson ? JSON.parse(senderJson) : {}

    if (props.msg.json) {
      const json = jsonValues()
      const update = getJsonUpdate(
        ctx.preset?.jsonSource === 'character'
          ? ctx.activeMap[props.msg.characterId!]?.json
          : ctx.preset?.json,
        json
      )

      if (update) {
        msgStore.editMessageProp(props.msg._id, {
          ...update,
          ...sender,
        })
      }

      setEdit(false)
      return
    }

    if (!editRef) return

    msgStore.editMessageProp(props.msg._id, {
      msg: editRef.innerText,
      ...sender,
    })
    setEdit(false)
  }

  const cancelEdit = () => setEdit(false)

  const startEdit = () => {
    setEdit(true)

    if (!props.msg.characterId) {
      setEditSender(JSON.stringify({ userId: props.msg.userId }))
    } else {
      setEditSender(JSON.stringify({ characterId: props.msg.characterId }))
    }
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

  const imageSpeed = createMemo(() => {
    const next = ctx.waiting?.image ?? 1
    return next
  })

  const senderOptions = createMemo(() => {
    if (!edit()) return []

    const opts: Array<{ label: string; value: string }> = []
    const seen = new Set<string>()
    let impersonated = false

    for (const { msg } of Object.values(ctx.chatTree)) {
      if (!msg.characterId) continue
      if (seen.has(msg.characterId)) continue

      const bot = ctx.allBots[msg.characterId]
      if (!bot) continue

      seen.add(msg.characterId)

      if (ctx.impersonate && bot._id === ctx.impersonate._id) {
        impersonated = true
      }

      opts.push({
        label: `Bot: ${bot.name}`,
        value: JSON.stringify({ characterId: bot._id }),
      })
    }

    if (!impersonated && ctx.impersonate && !seen.has(ctx.impersonate._id)) {
      opts.push({
        label: `Bot: ${ctx.impersonate.name}`,
        value: JSON.stringify({ characterId: ctx.impersonate._id }),
      })
    }

    if (ctx.profile && ctx.user) {
      opts.push({
        label: `Profile: ${ctx.profile?.handle || 'You'}`,
        value: JSON.stringify({ userId: ctx.user._id }),
      })
    }

    return opts
  })

  const editMessageMeta = () => {
    msgStore.setMetadataMsg(props.msg)
    // rootModalStore.info(
    //   'Message Information',
    //   <Meta
    //     msg={props.msg}
    //     history={ctx.promptHistory[props.msg._id]}
    //     flags={ctx.flags}
    //     tree={ctx.chatTree}
    //     loading={!!ctx.waiting}
    //   />
    // )
  }

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
                    <AvatarIcon format={format()} Icon={PauseCircle} bot />
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
                class={`flex min-w-0 shrink flex-col items-start gap-1 overflow-hidden align-middle`}
                classList={{
                  'sm:flex-col': props.isPaneOpen,
                  'sm:gap-1': props.isPaneOpen,
                  'sm:flex-row': !props.isPaneOpen,
                  'sm:gap-0': !props.isPaneOpen,
                  'sm:items-end': !props.isPaneOpen,
                  italic: props.msg.ooc,
                }}
              >
                <Show
                  when={!edit()}
                  fallback={
                    <>
                      <Select
                        parentClass="!pr-1"
                        class="!py-0.5 !pl-2 !text-sm"
                        items={senderOptions()}
                        value={editSender()}
                        onChange={(ev) => setEditSender(ev.value)}
                      />
                    </>
                  }
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
                </Show>

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
                      onClick={editMessageMeta}
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
                    ctx={ctx}
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
                  <MessageImages msg={props.msg} onEditClick={editMessageMeta} />
                </Match>

                <Match when={!edit()}>
                  <Show
                    when={
                      content().generating &&
                      content().thoughts.length > 0 &&
                      !content().message.length
                    }
                  >
                    <div class="text-500 text-sm italic">Thinking...</div>
                  </Show>
                  <Show
                    when={
                      ctx.ui.expandReasoning
                        ? true
                        : !content().generating || content().message.length > 0
                    }
                  >
                    <Reasoning expanded={ctx.ui.expandReasoning} thoughts={content().thoughts} />
                  </Show>
                  <p
                    class={`rendered-markdown pr-1 ${content().class}`}
                    data-bot-message={!props.msg.userId}
                    data-user-message={!!props.msg.userId}
                    innerHTML={content().message}
                  />
                  <Show when={content().generating}>
                    <span class="flex h-8 w-12 items-center justify-center">
                      <span class="dot-flashing bg-[var(--hl-700)]"></span>
                    </span>
                  </Show>
                  <Show when={ctx.waiting?.image && ctx.waiting.messageId === props.msg._id}>
                    <div class="flex w-full justify-center">
                      <RelativeSpinner speed={imageSpeed()} />{' '}
                      <span
                        class="text-500 text-xs italic"
                        classList={{ hidden: !ctx.status?.wait_time }}
                      >
                        {ctx.status?.wait_time || '0'}s
                      </span>
                    </div>
                  </Show>

                  <MessageImages msg={props.msg} onEditClick={editMessageMeta} />
                  <MessageAttachments msg={props.msg} ctx={ctx} />

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

const JsonEdit: Component<{
  msg: SplitMessage
  update: (next: any) => void
}> = (props) => {
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
  ctx: ContextState
}> = (props) => {
  let menuParent: any

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
        show: props.msg.adapter !== 'image' && !props.partial,
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

      attach: {
        key: 'attach',
        class: '',
        label: 'Attach',
        outer: { outer: false, pos: 0 },
        icon: ImagePlus,
        show:
          props.ctx.canUseAttachments &&
          (props.msg.userId === props.ctx.user?._id ||
            props.ctx.impersonate?._id === props.msg.characterId),
        onClick: () =>
          settingStore.openAttach(
            { multiple: true, accept: 'image/jpg,image/png,image/jpeg' },
            (files) => attachImages(props.msg._id, files)
          ),
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
        classList={{ 'tour-message-opts': props.index === 0 }}
        onClick={() => props.showMore[1](true)}
        id={`actions-${props.msg._id}`}
        ref={(ref) => {
          menuParent = ref
        }}
      >
        <MoreHorizontal class="icon-button" />
      </div>

      <Show when={showInner()}>
        <DropMenu
          class="p-1"
          horz="right"
          vert="down"
          show={open()}
          close={() => props.showMore[1](false)}
          parent={menuParent}
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
    msgStore.createImage({ sourceMsgId: split._id })
  }
}

function retryJsonSchema(original: AppSchema.ChatMessage, split: SplitMessage) {
  msgStore.retrySchema(split.chatId, original._id)
}

function renderMessage(ctx: ContextState, text: string, isUser: boolean, adapter?: string) {
  // Address unfortunate Showdown bug where spaces in code blocks are replaced with nbsp, except
  // it also encodes the ampersand, which results in them actually being rendered as `&amp;nbsp;`
  // https://github.com/showdownjs/showdown/issues/669

  // we sanizize user input to prevent XSS attacks
  // DomPurify has an implicit list of allowed Tags, when we add our own we have to use ADD_TAGS
  const html = Purify.sanitize(
    wrapWithQuoteElement(
      markdown.makeHtml(parseMessage(text, ctx, isUser, adapter)).replace(/&amp;nbsp;/g, '&nbsp;')
    ),
    {
      ADD_TAGS: ['qem'],
    }
  )

  return html
}

/**
 * Markup beautification. Lets us control color of diffrent HTML tags, expands on the markdown functionality
 * Especially useful for quotes, which are wrapped in <q> tags
 * and emphasis, which is wrapped in <qem> tags.
 */
function wrapWithQuoteElement(str: string) {
  // Replace all non-regular double quotes with double regular quotes
  // Unicode double quote characters: https://en.wikipedia.org/wiki/Quotation_mark#Unicode_code_point_table
  str = str.replace(/[\u201C\u201D\u201E\u201F]/g, '"')

  return str.replace(
    /*
    Regex magic explained:
    <[\s\S]*?>      - skip all HTML tags   eg. <sumting>
    ```[\s\S]*?```  - skip all code blocks eg. <pre>/``` markdown transform <pre><code> to ```
    ``[\s\S]*?``    - skip all inline code eg. <code>/`` markdown transform <code> to `` | this is a non standard markup 
    `[\s\S]*?`      - skip all inline code eg. <code>/` markdown transform <code> to `

    (\".+?\")       - capture all regular double quotes, which are not part of HTML tags or code blocks
    All captured groups are passed to the wrapCaptureGroupQuotes function
    */
    /<[\s\S]*?>|```[\s\S]*?```|``[\s\S]*?``|`[\s\S]*?`|(\".+?\")/gm,
    wrapCaptureGroupQuotes
  )
}

/** Processes capture group from above */
function wrapCaptureGroupQuotes(match: string, regularQuoted?: string) {
  if (regularQuoted) {
    /*If we have a valid string then we are within a quote
    ([\s\S]*?) - we ignore all characters between <em> and </em>
    a valid capure will look like this: "lets have some <em>fun</em>"
    we then pass the capture group to wrapCaptureGroupEmphasis function, which will replace <em> with <qem>
    */
    regularQuoted = regularQuoted.replace(/<em>([\s\S]*?)<\/em>/gm, wrapCaptureGroupEmphasis)
    return '<q>"' + regularQuoted.replace(/\"/g, '') + '"</q>'
  }
  return match
}

/** Replaces all <em> tags within a <q> tag with <qem> tags */
function wrapCaptureGroupEmphasis(match: string, emphasisQuote?: string) {
  if (emphasisQuote) {
    return '<qem>' + emphasisQuote.replace(/\"/g, '') + '</qem>'
  }
  return match
}

function sendAction(_send: MessageProps['sendMessage'], action: AppSchema.ChatAction) {
  events.emit(EVENTS.setInputText, action.action)
}

function parseMessage(msg: string, ctx: ContextState, isUser: boolean, adapter?: string) {
  if (adapter === 'image') {
    return msg.replace(BOT_REPLACE, ctx.char?.name || '').replace(SELF_REPLACE, ctx.handle)
  }

  const parsed = msg.replace(BOT_REPLACE, ctx.char?.name || '').replace(SELF_REPLACE, ctx.handle)
  return parsed
}

function canShowMeta(msg: AppSchema.ChatMessage, history: any) {
  if (!msg) return false
  if (msg._id === 'partial-response') return false

  return (
    !!msg.adapter ||
    !!history ||
    (!!msg.meta && Object.keys(msg.meta).length >= 1) ||
    msg.imagePrompt
  )
}

function getMessageContent(ctx: ContextState, props: MessageProps, state: ChatState) {
  const isRetry = props.retrying?._id === props.msg._id
  const isPartial = props.msg._id === 'partial-response'

  if (isRetry || isPartial) {
    const { thoughts, content } = extractReasoning(
      props.partial ? props.partial : props.msg.msg,
      ctx.preset?.reasoning
    )
    if (props.partial) {
      return {
        type: 'partial' as const,
        message: renderMessage(ctx, content, false, 'partial'),
        thoughts,
        class: 'streaming-markdown',
        generating: true,
      }
    }

    if (isPartial && props.msg.msg) {
      return {
        type: 'partial' as const,
        message: renderMessage(ctx, content, false, 'partial'),
        thoughts,
        class: 'streaming-markdown',
        generating: true,
      }
    }

    return {
      type: 'waiting' as const,
      message: '',
      thoughts,
      class: 'not-streaming',
      generating: true,
    }
  }

  const { thoughts, content } = extractReasoning(props.msg.msg, ctx.preset?.reasoning)
  let message = content

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
    type: 'message' as const,
    message: renderMessage(ctx, message, !!props.msg.userId, props.msg.adapter),
    thoughts,
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

function extractReasoning(content: string, tags: AppSchema.UserGenPreset['reasoning']) {
  const open = tags?.start || '<think>'
  const close = tags?.end || '</think>'

  if (!open || !close) return { thoughts: [], content }

  const len = {
    open: open.length,
    close: close.length,
  }

  const thoughts: string[] = []

  if (!content) return { thoughts, content }

  while (true) {
    const start = content.indexOf(open)
    const end = content.indexOf(close)

    // No starting tag
    if (start < 0) {
      // No end tag either, do nothing
      if (end < 0) break

      // We have an end tag, so capture everything from the start as a thought
      const thought = content.slice(0, end)
      thoughts.push(thought)
      content = content.slice(end + len.close)
      break
    }

    if (end > start) {
      const actualStart = Math.max(start, 0)
      const thought = content.slice(actualStart + len.open, end)
      thoughts.push(thought)
      content = content.slice(end + len.close)
      continue
    }

    const thought = content.slice(start + len.open)
    thoughts.push(thought)
    content = ''
    break
  }

  return { thoughts: thoughts.filter((t) => !!t.trim()), content }
}

const Reasoning: Component<{ thoughts: string[]; expanded?: boolean }> = (props) => {
  return (
    <For each={props.thoughts}>
      {(thought) => <Thought expanded={props.expanded}>{thought}</Thought>}
    </For>
  )
}

const Thought: Component<{ expanded?: boolean; children: any }> = (props) => {
  const [open, setOpen] = createSignal(props.expanded ?? false)

  return (
    <div class="flex flex-col gap-1">
      <div class="text-500 cursor-pointer text-sm" onClick={() => setOpen(!open())}>
        Thought{' '}
        <Show when={open()} fallback={'+'}>
          -
        </Show>
      </div>
      <Show when={open()}>
        <span class="text-600">{props.children}</span>
      </Show>
    </div>
  )
}

async function attachImages(msgId: string, files: FileInputResult[]) {
  if (!msgId || msgId === 'partial') return
  const add: MsgAttachment[] = []

  for (const file of files) {
    const ext = file.file.name.split('.').slice(-1)[0].toLowerCase()
    if (!ALLOWED_TYPES.has(ext)) {
      continue
    }

    const buffer = await getFileAsDataURL(file.file)
    if (!buffer) continue
    const shrink = await resizeImage(buffer, { type: 'fit', max: 768 })
    add.push({ type: 'image', image: shrink.content })
  }

  msgStore.addAttachment(msgId, add)
}
