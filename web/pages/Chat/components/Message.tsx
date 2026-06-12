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
  ImagePlus,
  Eye,
  EyeOff,
  BracesIcon,
} from 'lucide-solid'
import {
  Accessor,
  Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  JSX,
  Match,
  on,
  onCleanup,
  onMount,
  Show,
  Signal,
  Switch,
} from 'solid-js'
import { BOT_REPLACE, isMessageInvisible, SELF_REPLACE } from '../../../../common/prompt'
import { AppSchema } from '../../../../common/types/schema'
import AvatarIcon, { CharacterAvatar } from '../../../shared/AvatarIcon'
import {
  chatStore,
  userStore,
  msgStore,
  ChatState,
  VoiceState,
  pageStore,
  responseStore,
} from '../../../store'
import { markdown } from '../../../shared/markdown'
import Button, { ButtonSchema } from '/web/shared/Button'
import { ChatContext, useAppContext } from '/web/store/context'
import { hydrateTemplate, trimSentence } from '/common/util'
import { EVENTS, events } from '/web/emitter'
import { Pill } from '/web/shared/Card'
import { DropMenu } from '/web/shared/DropMenu'
import { Portal } from 'solid-js/web'
import { UI } from '/common/types'
import { LucideProps } from 'lucide-solid/dist/types/types'
import { createStore } from 'solid-js/store'
import { MessageImages } from './MessageImages'
import Select from '/web/shared/Select'
import { FileInputResult, getFileAsDataURL } from '/web/shared/FileInput'
import { resizeImage } from '/web/shared/image-resize'
import { MsgAttachment } from '/srv/adapter/type'
import { ALLOWED_TYPES } from '/web/store/data/image'
import { MessageAttachments } from './Attachments'
import { ComponentEventEmitter, getJsonSchema, isToday, toShortDuration } from '/web/shared/util'
import { extractReasoning } from '/common/reasoning'
import { SendFunc } from './InputBar'
import { ContextPreset, PresetContext } from '/web/store/preset-context'
import { runPresetParsers } from '/common/chat'

type MessageProps = {
  messageId: string
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
  partial?: { thoughts?: string; tokens?: string }
  sendMessage: SendFunc
  isPaneOpen: boolean
  showHiddenEvents?: boolean
  textBeforeGenMore?: string
  voice?: VoiceState
  firstInserted?: boolean
  index: number

  content: string
  characterId?: string
  userId?: string
  handle?: string

  preset: PresetContext | undefined
  canUseAttachments?: boolean
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
  const user = userStore((s) => ({ ui: s.ui, user: s.user }))
  const state = chatStore((s) => ({ memberIds: s.memberIds, chatProfiles: s.chatProfiles }))
  const [edit, setEdit] = createSignal(false)
  const [editSender, setEditSender] = createSignal<string>()

  const msg = createMemo((): AppSchema.ChatMessage & { handle?: string } => {
    const treeMsg = ctx.chatTree[props.messageId]?.msg
    if (treeMsg) return treeMsg

    return {
      kind: 'chat-message',
      _id: props.messageId,
      userId: props.userId || '',
      characterId: props.characterId || '',
      chatId: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      msg: '',
      retries: [],
    }
  })

  const handle = createMemo(() => {
    const message = msg()

    const characterId = props.characterId || message.characterId
    const userId = props.userId || message.userId

    if (characterId) {
      const char = ctx.allBots[characterId] || ctx.tempMap[characterId]
      if (char) return char.name || message.handle || ''
    }

    if (userId) {
      const profile =
        userId === ctx.profile?.userId
          ? ctx.profile
          : ctx.chatProfiles?.find((m) => m.userId === userId) || ctx.profile

      return profile?.handle || 'You'
    }

    return 'You'
  })

  const isBot = createMemo(() => !!props.characterId || !!msg()?.characterId)
  const isUser = createMemo(() => !!props.userId || !!msg().userId)

  const [img, setImg] = createSignal('h-full')
  const opts = createSignal(false)
  const [jsonValues, setJsonValues] = createSignal(msg().json?.values || {})
  const [jsonMsg, setJsonMsg] = createSignal('')

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
    const message = msg()

    let display = message.json?.response || props.content

    if (message.json?.values) {
      const autoDefs = getJsonSchema({
        characterId: message.characterId,
        preset: props.preset?.current!,
      })

      const json = getJsonUpdate(ctx, autoDefs?.schema, {
        ...message.json.values,
        response: props.content,
      })
      display = json?.json.response || display
    }

    const msgV2 = getMessageContent(ctx, props.preset?.current, props, state.chatProfiles, {
      ...message,
      msg: display,
    })
    return msgV2
  })

  const saveEdit = () => {
    const message = msg()
    const senderJson = editSender()
    const sender = senderJson ? JSON.parse(senderJson) : {}

    if (message.json) {
      const json = { ...jsonValues() }

      const autoDefs = getJsonSchema({
        characterId: message.characterId,
        preset: props.preset?.current!,
      })

      const update = getJsonUpdate(ctx, autoDefs?.schema, json)

      if (update) {
        msgStore.editMessageProp(message._id, {
          ...update,
          ...sender,
          msg: jsonMsg(),
        })
      }

      setEdit(false)
      return
    }

    if (!editRef) return

    msgStore.editMessageProp(message._id, {
      msg: editRef.innerText,
      ...sender,
    })
    setEdit(false)
  }

  const cancelEdit = () => setEdit(false)

  const startEdit = () => {
    setEdit(true)
    const message = msg()

    setJsonMsg(message.msg)

    if (!message.characterId) {
      setEditSender(JSON.stringify({ userId: message.userId }))
    } else {
      setEditSender(JSON.stringify({ characterId: message.characterId }))
    }
    if (editRef) {
      editRef.innerText = props.content
    }
    editRef?.focus()
  }

  const alt = createMemo(() => {
    const message = msg()
    const percent = `${ctx.ui.chatAlternating ?? 0}%`
    return {
      width: `calc(100% - ${ctx.ui.chatAlternating ?? 0}%)`,
      'margin-right': ctx.user?._id === message.userId ? percent : undefined,
      'margin-left': ctx.user?._id !== message.userId ? percent : undefined,
    }
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
        label: `Profile: ${ctx.profile?.handle || ''}`,
        value: JSON.stringify({ userId: ctx.user._id }),
      })
    }

    return opts
  })

  const editMessageMeta = () => {
    msgStore.setMetadataMsg(msg())
  }

  const visibleIcon = createMemo(() => {
    const message = msg()
    if (!ctx.chat) return null
    if (!ctx.replyAs) return null

    const state = isMessageInvisible(ctx.chat, message, ctx.replyAs)

    const Icon = state ? EyeOff : Eye
    const nextState = state ? false : true
    const invisible = { ...message.invisible, [ctx.replyAs]: nextState }

    return (
      <span
        class="icon-button ml-2"
        onClick={() => msgStore.editMessageProp(message._id, { invisible })}
      >
        <Icon size={14} />
      </span>
    )
  })

  return (
    <div
      class={'flex w-full rounded-md px-2 py-2 pr-2 sm:px-4'}
      data-sender={msg().characterId ? 'bot' : 'user'}
      data-bot={msg().characterId ? ctx.char?.name : ''}
      data-user={msg().userId ? state.memberIds[msg().userId || '']?.handle : msg().name}
      data-last={props.last?.toString()}
      data-lastsplit="true"
      style={true ? {} : alt()}
      classList={{
        'bg-chat-bot': !msg().ooc && !msg().userId,
        'bg-chat-user': !msg().ooc && !!msg().userId,
        'bg-chat-ooc': !!msg().ooc,
        unblur: showOpt[0](),
      }}
    >
      <div class={`flex w-full`} classList={{ 'opacity-50': !!msg().ooc }}>
        <div class={`flex h-fit w-full select-text flex-col gap-1`}>
          <div class="break-words">
            <span
              class={`float-left pr-3`}
              style={{ 'min-height': user.ui.imageWrap ? '' : img() }}
              data-bot-avatar={isBot()}
              data-user-avatar={isUser()}
            >
              <Show when={ctx.flags.debug}>
                <span class="text-600 flex w-full justify-center text-[0.5rem]">
                  {msg().parent?.slice(0, 4) || 'root'} #{props.index}
                </span>
              </Show>
              <Switch>
                <Match when={user.ui.avatarSize === 'hide'}>{null}</Match>
                <Match when={msg().event === 'world' || msg().event === 'ooc'}>
                  <div
                    class={`avatar-${format().size} flex shrink-0 items-center justify-center pt-3`}
                  >
                    <Zap />
                  </div>
                </Match>

                <Match when={props.voice === 'generating'}>
                  <div class="animate-pulse cursor-pointer" onClick={responseStore.stopSpeech}>
                    <AvatarIcon format={format()} Icon={DownloadCloud} />
                  </div>
                </Match>

                <Match when={props.voice === 'playing'}>
                  <div class="animate-pulse cursor-pointer" onClick={responseStore.stopSpeech}>
                    <AvatarIcon format={format()} Icon={PauseCircle} bot />
                  </div>
                </Match>

                <Match when={ctx.allBots[msg().characterId!]}>
                  <CharacterAvatar
                    char={ctx.allBots[msg().characterId!]}
                    format={format()}
                    openable
                    bot
                    zoom={1.75}
                  />
                </Match>

                <Match when={!msg().characterId}>
                  <AvatarIcon
                    format={format()}
                    Icon={DownloadCloud}
                    avatarUrl={state.memberIds[msg().userId!]?.avatar}
                    anonymize={ctx.anonymize}
                  />
                </Match>

                <Match when>
                  <AvatarIcon
                    format={format()}
                    Icon={DownloadCloud}
                    avatarUrl={state.memberIds[msg().userId!]?.avatar}
                    anonymize={ctx.anonymize}
                  />
                </Match>
              </Switch>
              <Show when={ctx.flags.debug}>
                <span class="text-600 flex w-full justify-center text-[0.5rem]">
                  {msg()._id.slice(0, 4)}
                </span>
              </Show>
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
                  italic: msg().ooc,
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
                    data-bot-name={isBot()}
                    data-user-name={isUser()}
                    classList={{
                      hidden: !!msg().event,
                      'sm:text-base': props.isPaneOpen,
                      'sm:text-lg': !props.isPaneOpen,
                    }}
                  >
                    {ctx.anonymize && !msg().characterId
                      ? getAnonName(msg().userId!)
                      : handle() || 'You'}
                  </b>
                </Show>

                <span
                  classList={{ invisible: ctx.anonymize }}
                  class={`message-date text-600 flex items-center text-xs leading-none`}
                  data-bot-time={isBot()}
                  data-user-time={isUser()}
                >
                  <Switch>
                    <Match when={isToday(msg().createdAt)}>
                      <span>{new Date(msg().createdAt).toLocaleTimeString()}</span>
                    </Match>

                    <Match when>
                      <span class="hidden sm:block">
                        {new Date(msg().createdAt).toLocaleString()}
                      </span>
                      <span class="block sm:hidden">{toShortDuration(msg().createdAt)} ago</span>
                    </Match>
                  </Switch>

                  <Show when={ctx.flags.debug || canShowMeta(msg(), ctx.promptHistory[msg()._id])}>
                    <span
                      class="text-600 hover:text-900 ml-1 cursor-pointer"
                      onClick={editMessageMeta}
                    >
                      <Info size={14} />
                    </span>
                  </Show>

                  {visibleIcon()}
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
                    msg={msg()}
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
                    preset={props.preset}
                    canUseAttachments={props.canUseAttachments}
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
                <Match when={msg().adapter === 'image'}>
                  <MessageImages
                    messageId={props.messageId}
                    msg={msg()}
                    onEditClick={editMessageMeta}
                    ctx={ctx}
                  />
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
                  <Show
                    when={(content().generating || props.last) && +ctx.ui.textSpeed! > 0}
                    fallback={
                      <p
                        class={`rendered-markdown pr-1 ${content().class}`}
                        data-bot-message={!msg().userId}
                        data-user-message={!!msg().userId}
                        innerHTML={content().message}
                      />
                    }
                  >
                    <Typewriter
                      text={content().message}
                      speed={ctx.ui.textSpeed}
                      generating={!!content().generating}
                    />
                  </Show>

                  <Show when={content().generating}>
                    <span class="flex h-8 w-12 items-center justify-center">
                      <span class="dot-flashing bg-[var(--hl-700)]"></span>
                    </span>
                  </Show>

                  <MessageImages
                    messageId={props.messageId}
                    msg={msg()}
                    onEditClick={editMessageMeta}
                    ctx={ctx}
                  />
                  <MessageAttachments msg={msg()} ctx={ctx} />

                  <Show when={!props.partial && props.last}>
                    <div class="flex items-center justify-center gap-2">
                      <For each={msg().actions}>
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

                <Match when={edit() && msg().json}>
                  <JsonEdit
                    msg={msg()}
                    update={(next) => setJsonValues(next)}
                    message={(text: string) => setJsonMsg(text)}
                  />
                </Match>
                <Match when={edit()}>
                  <div
                    class="msg-edit-text-box p-1 !outline-0"
                    ref={editRef!}
                    contentEditable={true}
                    onKeyUp={(ev) => {
                      if (ev.key === 'Escape') cancelEdit()
                      if (ev.altKey && (ev.code === 'KeyS' || ev.key === 's')) {
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
  message: (next: string) => void
}> = (props) => {
  const entries = createMemo(() => Object.keys(props.msg.json?.values || {}))
  const [editing, setEditing] = createStore<Record<string, string>>(props.msg.json?.values || {})

  onMount(() => {
    props.update(props.msg.json?.values || {})
  })

  return (
    <div class="flex flex-col gap-2">
      <Show when={!props.msg.json?.values?.response}>
        <div class="flex flex-col">
          <Pill type="bg" small opacity={0.5} class="rounded-b-none rounded-t-md">
            message
          </Pill>
          <div
            ref={(r) => (r.innerText = props.msg.msg)}
            class="msg-edit-text-box rounded-md rounded-tl-none border border-[var(--bg-500)] p-1 !outline-0"
            contentEditable={true}
            onKeyUp={(ev: any) => props.message(ev.target.innerText)}
          ></div>
        </div>
      </Show>

      <For each={entries()}>
        {(key) => (
          <div class="flex flex-col">
            <Pill type="bg" small opacity={0.5} class="rounded-b-none rounded-t-md">
              {key}
            </Pill>
            <div
              ref={(r) => (r.innerText = editing[key])}
              class="msg-edit-text-box rounded-md rounded-tl-none border border-[var(--bg-500)] p-1 !outline-0"
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
  partial?: { thoughts?: string; tokens?: string }
  show: Signal<boolean>
  textBeforeGenMore?: string
  onRemove: () => void
  showMore: Signal<boolean>
  ctx: ChatContext
  preset: PresetContext | undefined
  canUseAttachments: boolean | undefined
}> = (props) => {
  let menuParent: any

  const closer = (action: (msg: AppSchema.ChatMessage) => void) => {
    return () => {
      action(props.msg)
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
        onClick: (self: AppSchema.ChatMessage) => void
        show: boolean
        schema?: ButtonSchema
        icon: (props: LucideProps) => JSX.Element
        disabled?: boolean
      }
    > = {
      prompt: {
        key: 'prompt',
        label: 'Prompt',
        class: 'prompt-btn',
        outer: props.ui.msgOptsInline.prompt,
        show: !!props.msg.characterId && props.msg.adapter !== 'image',
        onClick: () =>
          !props.partial && chatStore.computePrompt(props.ctx.messages.path, props.msg),
        icon: Terminal,
      },

      edit: {
        key: 'edit',
        label: 'Edit',
        class: 'edit-btn',
        outer: props.ui.msgOptsInline.edit,
        show: props.msg.adapter !== 'image',
        disabled: !!props.ctx.waiting,
        onClick: props.startEdit,
        icon: Pencil,
      },

      fork: {
        key: 'fork',
        label: 'Fork',
        class: 'fork-btn',
        show: !props.last,
        outer: props.ui.msgOptsInline.fork,
        onClick: () => {
          if (props.partial) return
          chatStore.forkChat(props.msg._id)
        },
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

      attach: {
        key: 'attach',
        class: '',
        label: 'Attach',
        outer: { outer: false, pos: 0 },
        icon: ImagePlus,
        show:
          !!props.canUseAttachments &&
          (props.msg.userId === props.ctx.user?._id ||
            props.ctx.impersonate?._id === props.msg.characterId),
        onClick: () =>
          pageStore.openAttach(
            { multiple: true, accept: 'image/jpg,image/png,image/jpeg' },
            (files) => attachImages(props.msg._id, files)
          ),
      },

      visible: {
        key: 'visible',
        class: '',
        icon:
          props.ctx.replyAs &&
          props.ctx.chat &&
          isMessageInvisible(props.ctx.chat, props.msg, props.ctx.replyAs)
            ? EyeOff
            : Eye,
        label: 'Visibility',
        show: true,
        outer: props.ui.msgOptsInline.visible,
        onClick: () => chatStore.toggleMsgVisibility(props.msg._id),
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
        disabled: !!props.ctx.waiting,
      },

      'gen-image': {
        key: 'gen-image',
        label: 'Gen Image',
        show: true,
        outer: props.ui.msgOptsInline['gen-image'],
        onClick: (msg) => msgStore.createImage({ sourceMsgId: msg._id }),
        icon: ImagePlus,
        class: '',
      },

      'gen-json': {
        key: 'gen-json',
        label: 'Gen JSON',
        show: !!props.preset?.current?.json || !!props.preset?.json?.json,
        class: '',
        icon: BracesIcon,
        onClick: () => responseStore.chatQuery({ messageId: props.msg._id, question: '' }),
        outer: props.ui.msgOptsInline['gen-json'],
        disabled: !props.preset?.current?.json && !props.preset?.json?.json,
      },
    }

    return items
  })

  const showInner = createMemo(() => {
    const logics = logic()
    for (const opt of Object.values(logics)) {
      if (!opt.outer?.outer && opt.show) return true
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
          if (!def) return null

          return (
            <MessageOption
              id={props.msg._id}
              outer={def.outer?.outer ?? false}
              show={def.show}
              label={def.label}
              open={open()}
              onClick={closer(def.onClick)}
              class={def.class}
              schema={def.schema}
              disabled={def.disabled}
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
          onClick={() =>
            !props.partial && responseStore.continuation(props.msg.chatId, undefined, true)
          }
        >
          <Repeat1 size={18} />
        </div>
      </Show>

      <Show when={props.last && !props.msg.characterId}>
        <div
          class="icon-button"
          onClick={() => {
            if (props.partial) return
            // msgStore.resend(props.msg.chatId, props.msg._id)
            if (!props.ctx.chat?.characterId) return
            responseStore.request(props.ctx.chat._id, props.ctx.chat.characterId)
          }}
        >
          <RefreshCw size={18} />
        </div>
      </Show>
    </div>
  )
}

export const Typewriter: Component<{
  text: string
  class?: string
  speed?: number
  generating?: boolean
  reset?: ComponentEventEmitter<'reset'>
}> = (props) => {
  const [length, setLength] = createSignal(0)
  const [getTimer, setTimer] = createSignal<{ timer: NodeJS.Timeout; speed: number }>()

  const callback = () => setLength(0)

  const markup = createMemo(() => {
    const curr = length()
    return markdown.makeHtml(props.text.slice(0, curr))
  })

  const startTimer = () => {
    const setting = props.speed ?? 0
    let speed = 1000 / setting
    console.log(`[tw] set to ${speed}ms`)
    const prev = getTimer()

    if (prev && prev.speed === setting) return
    if (prev?.timer) {
      clearInterval(prev.timer)
    }

    const timer = setInterval(() => {
      const prev = length()
      if (prev === props.text.length) return

      if (setting <= 0) {
        setLength(prev + 1)
        return
      }

      setLength(prev + 1)
    }, speed)
    setTimer({ timer, speed: setting })
  }

  onMount(() => {
    if (props.reset) {
      props.reset.on('reset', callback)
    }

    // Always stream when no 'generating' flag is passed
    if (props.generating === undefined) {
      startTimer()
      return
    }

    // Case 1. Generating is always `false`: The message was fetched from history rather than generated
    if (!props.generating) {
      setLength(props.text.length)
      return
    }

    startTimer()
  })

  createEffect(
    on(
      () => ({ speed: props.speed }),
      () => {
        startTimer()
      }
    )
  )

  createEffect(
    on(
      () => ({ gen: props.generating, text: props.text }),
      (gen) => {
        if (!gen) return

        if (!props.text) {
          setLength(0)
          startTimer()
        }
      }
    )
  )

  onCleanup(() => {
    const timer = getTimer()
    clearInterval(timer?.timer!)
    props.reset?.off(callback)
  })

  return (
    <>
      <p
        class={`rendered-markdown streaming-markdown pr-1 ${props.class || ''}`}
        data-partial
        innerHTML={markup()}
      />
      {/* <span class="text-500 text-sm font-bold">{props.generating ? '(true)' : '(false)'}</span> */}
    </>
  )
}

const MessageOption: Component<{
  schema?: ButtonSchema
  class?: string
  id: string
  open: boolean | undefined
  show: boolean | undefined
  disabled: boolean | undefined
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
          <button
            class={`icon-button ${props.class || ''}`}
            disabled={props.disabled}
            onClick={(ev) => {
              ev.preventDefault()
              props.onClick()
            }}
          >
            {props.children}
          </button>
        </Show>

        <Show when={!props.outer}>
          <Button
            class={`${props.class || ''} w-full min-w-max`}
            schema={props.schema || 'secondary'}
            onClick={props.onClick}
            disabled={props.disabled}
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
    responseStore.retry({ chatId: split.chatId, msgId: original._id })
  } else {
    msgStore.createImage({ sourceMsgId: split._id })
  }
}

function renderMessage(
  ctx: ChatContext,
  preset: ContextPreset | undefined,
  text: string,
  isUser: boolean,
  adapter?: string
) {
  // Address unfortunate Showdown bug where spaces in code blocks are replaced with nbsp, except
  // it also encodes the ampersand, which results in them actually being rendered as `&amp;nbsp;`
  // https://github.com/showdownjs/showdown/issues/669

  // we sanizize user input to prevent XSS attacks
  // DomPurify has an implicit list of allowed Tags, when we add our own we have to use ADD_TAGS
  const html = Purify.sanitize(
    wrapWithQuoteElement(
      markdown
        .makeHtml(parseMessage(text, ctx, preset, isUser, adapter))
        .replace(/&amp;nbsp;/g, '&nbsp;')
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

function parseMessage(
  msg: string,
  ctx: ChatContext,
  preset: ContextPreset | undefined,
  isUser: boolean,
  adapter?: string
) {
  if (adapter === 'image') {
    return msg.replace(BOT_REPLACE, ctx.char?.name || '').replace(SELF_REPLACE, ctx.handle)
  }

  let parsed = msg.replace(BOT_REPLACE, ctx.char?.name || '').replace(SELF_REPLACE, ctx.handle)

  if (preset?.parsers) {
    parsed = runPresetParsers(preset.parsers, parsed)
  } else {
    parsed = runPresetParsers(
      [
        { type: 'remove', text: '<|begin_of_box|>' },
        { type: 'remove', text: '<|end_of_box|>' },
      ],
      parsed
    )
  }

  return parsed
}

function canShowMeta(msg: AppSchema.ChatMessage, history: any) {
  if (msg._id === 'partial-response') return false
  return true
}

function getMessageContent(
  ctx: ChatContext,
  preset: ContextPreset | undefined,
  props: MessageProps,
  profiles: ChatState['chatProfiles'],
  msg: AppSchema.ChatMessage & { handle?: string }
) {
  const isRetry = props.retrying?._id === msg._id
  const isPartial = msg._id === 'partial-response'

  if (isRetry || isPartial) {
    const { thoughts, content } = extractReasoning(props.partial ? props.partial : msg.msg, {
      tags: preset?.reasoning,
      display: ctx.ui.displayReasoning,
    })
    if (props.partial) {
      return {
        type: 'partial' as const,
        message: renderMessage(ctx, preset, content, false, 'partial'),
        thoughts,
        class: 'streaming-markdown',
        generating: true,
      }
    }

    if (isPartial && msg.msg) {
      return {
        type: 'partial' as const,
        message: renderMessage(ctx, preset, content, false, 'partial'),
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

  const { thoughts, content } = extractReasoning(msg.msg, {
    tags: preset?.reasoning,
    display: ctx.ui.displayReasoning,
  })

  let message = content

  if (props.last && props.swipe) message = props.swipe
  if (msg.event && !props.showHiddenEvents) {
    message = message.replace(/\(OOC:.+\)/, '')
  }

  if (ctx.anonymize) {
    message = profiles.reduce(anonymizeText, message).replace(SELF_REPLACE, 'User #1')
  }

  if (ctx.trimSentences && !msg.userId) {
    message = trimSentence(message)
  }

  const baseStops = preset?.stopSequences || []
  const sender = msg.characterId
    ? ctx.allBots[msg.characterId]?.name
    : msg.userId
    ? ctx.profileMap[msg.userId]?.handle
    : ''

  const allStops = (preset?.disableNameStops ? baseStops : baseStops.concat(ctx.nameStops)).filter(
    (name) => name !== sender + ':'
  )

  const trimmed = stopResponse({ text: message, author: sender, stops: allStops })

  return {
    type: 'message' as const,
    message: renderMessage(ctx, preset, trimmed, !!msg.userId, msg.adapter),
    thoughts,
    class: 'not-streaming',
  }
}

function stopResponse(opts: { text: string; author: string; stops: string[] }) {
  let generated = opts.text

  let index = -1
  let trimmed = opts.stops.reduce((prev, endToken) => {
    const idx = generated.indexOf(endToken)

    if (idx === -1) return prev

    const text = generated.slice(0, idx)
    if (index === -1 || idx < index) {
      index = idx
      return text
    }

    return prev
  }, '')

  if (index === -1) {
    if (generated.startsWith(`${opts.author}:`)) {
      generated = generated.slice(opts.author.length + 1)
    }

    return generated.trim()
  }

  return trimmed || generated
}

function getJsonUpdate(ctx: ChatContext, def: AppSchema.Character['json'], json: any) {
  if (!def) return
  const hydration = hydrateTemplate(def, json, {
    char: ctx.char!,
    replyAs: ctx.char,
    sender: ctx.profile,
    impersonate: ctx.impersonate,
  })

  return {
    json: hydration,
    msg: hydration.response,
  }
}

const Reasoning: Component<{ thoughts: string[]; expanded?: boolean }> = (props) => {
  return (
    <Show when={props.thoughts.length}>
      <Thought expanded={props.expanded} text={props.thoughts.join('\n\n')} />
    </Show>
  )
}

const Thought: Component<{ expanded?: boolean; text: string }> = (props) => {
  const [open, setOpen] = createSignal(props.expanded ?? false)

  const html = createMemo(() => markdown.makeHtml(props.text))

  return (
    <Show when={!!props.text.trim()}>
      <div class="flex flex-col gap-1">
        <div class="text-500 cursor-pointer text-sm" onClick={() => setOpen(!open())}>
          Thought{' '}
          <Show when={open()} fallback={'+'}>
            -
          </Show>
        </div>
        <Show when={open()}>
          <div class="text-600" innerHTML={html()}></div>
        </Show>
      </div>
    </Show>
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
