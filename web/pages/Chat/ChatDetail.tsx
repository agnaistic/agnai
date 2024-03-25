import './chat-detail.css'
import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  Index,
  onCleanup,
  onMount,
  Show,
} from 'solid-js'
import { useNavigate, useParams } from '@solidjs/router'
import ChatExport from './ChatExport'
import Button from '../../shared/Button'
import { setComponentPageTitle } from '../../shared/util'
import { characterStore, chatStore, settingStore, userStore } from '../../store'
import { msgStore } from '../../store'
import Message from './components/Message'
import PromptModal from './components/PromptModal'
import DeleteMsgModal from './DeleteMsgModal'
import { devCycleAvatarSettings, isDevCommand } from './dev-util'
import ForcePresetModal from './ForcePreset'
import DeleteChatModal from './components/DeleteChat'
import { useEffect, usePaneManager } from '/web/shared/hooks'
import { emptyMsg, InfiniteScroll, insertImageMessages, SwipeMessage } from './helpers'
import { useAutoExpression } from '/web/shared/Avatar/hooks'
import AvatarContainer from '/web/shared/Avatar/Container'
import { eventStore } from '/web/store/event'
import ChatPanes, { useValidChatPane } from './components/ChatPanes'
import { useAppContext } from '/web/store/context'
import { embedApi } from '/web/store/embeddings'
import { ModeDetail } from '/web/shared/Mode/Detail'
import { ChatHeader } from './ChatHeader'
import { ChatFooter } from './ChatFooter'
import { ConfirmModal } from '/web/shared/Modal'
import { TitleCard } from '/web/shared/Card'

export { ChatDetail as default }

const ChatDetail: Component = () => {
  const { updateTitle } = setComponentPageTitle('Chat')

  let container: HTMLDivElement

  const params = useParams()
  const pane = usePaneManager()

  const nav = useNavigate()
  const user = userStore()
  const chars = characterStore((s) => ({
    botMap: s.characters.map,
    ready: s.characters.loaded > 0 && s.chatChars.chatId === params.id,
  }))

  const [ctx] = useAppContext()

  const chats = chatStore((s) => ({
    ...(s.active?.chat._id === params.id ? s.active : undefined),
    lastId: s.lastChatId,
    members: s.chatProfiles,
    loaded: s.loaded,
    opts: s.opts,
    ready: s.allChars.list.length > 0 && (s.active?.char?._id || 'no-id') in s.allChars.map,
    linesAddedCount: s.prompt?.template.linesAddedCount,
  }))

  const msgs = msgStore((s) => ({
    msgs: s.msgs,
    images: s.images,
    partial: s.partial,
    waiting: s.waiting,
    speaking: s.speaking,
    retrying: s.retrying,
    inference: s.lastInference,
    textBeforeGenMore: s.textBeforeGenMore,
  }))

  const showPane = useValidChatPane()
  const express = useAutoExpression()

  const viewHeight = createMemo(() => {
    const mode = chats.char?.visualType === 'sprite' ? 'sprite' : 'avatar'
    const id = chats.char?._id || ''
    if (mode === 'sprite' && !chars.botMap[id]?.sprite) {
      return 0
    }

    if (mode === 'avatar' && !chars.botMap[id]?.avatar) {
      return 0
    }

    const percent = user.ui.viewHeight || 40
    return `calc(${percent}vh - 24px)`
  })

  const isGreetingOnlyMsg = createMemo(() => msgs.msgs.length === 1)

  let [evented, setEvented] = createSignal(false)
  const retries = createMemo(() => {
    const last = msgs.msgs.slice(-1)[0]
    if (!last && !isGreetingOnlyMsg()) return

    const list = last.retries?.slice() || []
    list.unshift(last.msg)
    return { msgId: last._id, list }
  })

  const [swipe, setSwipe] = createSignal(0)
  const [removeId, setRemoveId] = createSignal('')

  const [showHiddenEvents, setShowHiddenEvents] = createSignal(false)
  const [linesAddedCount, setLinesAddedCount] = createSignal<number | undefined>(undefined)

  const chatMsgs = createMemo(() => {
    const self = user.profile
    const messages = msgs.msgs.map((msg) => {
      if (msg.characterId) {
        if (msg.characterId === ctx.impersonate?._id) {
          return { ...msg, handle: ctx.impersonate.name }
        }

        const handle = ctx.allBots[msg.characterId] || ctx.tempMap[msg.characterId]
        return { ...msg, handle: handle?.name }
      }

      if (msg.userId) {
        const profile =
          msg.userId === self?.userId
            ? self
            : chats.members.find((m) => m.userId === msg.userId) || self
        return { ...msg, handle: profile?.handle || 'You' }
      }

      return msg
    })

    if (!chats.chat || !chats.char) return []
    const doShowHiddenEvents = showHiddenEvents()
    return insertImageMessages(messages, msgs.images[params.id]).filter((msg) => {
      if (chats.opts.hideOoc && msg.ooc) return false
      if (msg.event === 'hidden' && !doShowHiddenEvents) return false
      return true
    })
  })

  onMount(() => {
    chatStore.computePrompt(msgs.msgs[msgs.msgs.length - 1], false)
    setLinesAddedCount(chats.linesAddedCount)
  })

  const firstInsertedMsgIndex = createMemo(() => {
    const linesAdded = linesAddedCount()
    if (linesAdded) return chatMsgs().length - 1 - linesAdded
  })

  createEffect(() => {
    // On Connect Events
    if (evented() || !chats.chat || !chats.char || !chars.ready || !chats.ready) return
    setEvented(true)

    const messages = msgs.msgs
    const isNonEvent = !msgs.msgs[0]?.event
    if (isNonEvent && messages.length <= 1) {
      eventStore.onGreeting(chats.chat)
    } else {
      eventStore.onChatOpened(chats.chat, new Date(messages[messages.length - 1].createdAt))
    }

    if (chats.chat.userEmbedId) {
      embedApi.loadDocument(chats.chat.userEmbedId)
    }
  })

  const descriptionText = createMemo(() => {
    if (!chats.char?.description) return null

    return (
      <>
        {chats.char!.description!.split('\n').map((line) => (
          <div>{line}</div>
        ))}
      </>
    )
  })
  const isOwner = createMemo(() => chats.chat?.userId === user.user?._id)
  const tts = createMemo(() => (user.user?.texttospeech?.enabled ?? true) && !!chats.char?.voice)

  const waitingMsg = createMemo(() => {
    if (!msgs.waiting) return
    if (msgs.retrying) return

    const userId = msgs.waiting.userId
    const charId = msgs.waiting.characterId
    const profile =
      user.profile?.userId === userId
        ? user.profile
        : chats.members.find((ch) => ch.userId === userId)
    const char = charId ? ctx.allBots[charId] : undefined

    const handle = msgs.waiting.mode !== 'self' ? char?.name : profile?.handle
    return emptyMsg({
      id: 'partial',
      charId: msgs.waiting?.mode !== 'self' ? msgs.waiting.characterId : undefined,
      userId: msgs.waiting?.mode === 'self' ? msgs.waiting.userId || user.user?._id : undefined,
      message: msgs.partial || '',
      adapter: 'partial',
      handle: handle || 'You',
    })
  })

  const clearModal = () => {
    chatStore.option({ options: false, modal: 'none' })
  }

  const clickSwipe = (dir: -1 | 1) => () => {
    const ret = retries()
    if (!ret || !ret.list.length) return
    const prev = swipe()
    const max = ret.list.length - 1

    let next = prev + dir
    if (next < 0) next = max
    else if (next > max) next = 0

    setSwipe(next)
  }

  createEffect(() => {
    if (!msgs.inference) return
    if (!ctx.info) return

    // express.classify(opts.preset, msgs.inference.text)
    msgStore.clearLastInference()
  })

  createEffect(() => {
    const charName = chats.char?.name
    updateTitle(charName ? `Chat with ${charName}` : 'Chat')

    if (!params.id) {
      if (!chats.lastId) return nav('/character/list')
      return nav(`/chat/${chats.lastId}`)
    }

    if (params.id !== chats.chat?._id) {
      chatStore.getChat(params.id)
    }
  })

  const sendMessage = (message: string, ooc: boolean, onSuccess?: () => void) => {
    if (isDevCommand(message)) {
      switch (message) {
        case '/devCycleAvatarSettings':
          devCycleAvatarSettings(user)
          onSuccess?.()
          return

        case '/devShowHiddenEvents':
          setShowHiddenEvents(!showHiddenEvents())
          break
      }
    }

    // If the number of active bots is 1 or fewer then always request a response
    const kind = ooc ? 'ooc' : chats.replyAs || ctx.activeBots.length <= 1 ? 'send' : 'send-noreply'
    if (!ooc) setSwipe(0)
    msgStore.send(chats.chat?._id!, message, kind, onSuccess)
    return
  }

  const requestMessage = (charId: string) => msgStore.request(chats.chat?._id!, charId)
  const cancelSwipe = () => setSwipe(0)

  const confirmSwipe = (msgId: string) => {
    msgStore.confirmSwipe(msgId, swipe(), () => {
      setSwipe(0)
    })
  }

  const indexOfLastRPMessage = createMemo(() => {
    return msgs.msgs.reduceRight(
      (prev, curr, i) => (prev > -1 ? prev : !curr.ooc && curr.adapter !== 'image' ? i : -1),
      -1
    )
  })

  const generateFirst = () => {
    msgStore.retry(chats.chat?._id!)
  }

  const characterPills = createMemo(() => {
    const bots = ctx.activeBots.filter((bot) => {
      if (ctx.tempMap[bot._id]?.favorite === false) return false
      return true
    })
    return bots
  })

  useEffect(() => {
    function keyboardShortcuts(ev: KeyboardEvent) {
      if (!ev.altKey) return

      const num = +ev.key
      if (num >= 1) {
        const pill = characterPills()[num - 1]
        if (!pill) return

        ev.preventDefault()
        if (msgs.retrying || msgs.partial) return
        requestMessage(pill._id)
      }

      if (ev.key === 'r') {
        ev.preventDefault()
        if (msgs.retrying || msgs.partial) return
        const last = indexOfLastRPMessage()
        const msg = msgs.msgs[last]
        if (!msg) return
        if (msg.adapter === 'image') {
          msgStore.createImage(msg._id)
        } else if (msg.characterId) {
          msgStore.retry(msg.chatId, msg._id)
        } else {
          msgStore.resend(msg.chatId, msg._id)
        }
      }

      if (ev.key === 'i') {
        ev.preventDefault()
        settingStore.toggleImpersonate(true)
      }

      if (ev.key === 'a') {
        ev.preventDefault()
        const last = indexOfLastRPMessage()
        const msg = msgs.msgs[last]
        if (!msg?.characterId) return

        msgStore.request(msg.chatId, msg.characterId)
      }
    }

    document.addEventListener('keydown', keyboardShortcuts)

    return () => document.removeEventListener('keydown', keyboardShortcuts)
  })

  const split = createMemo(() => {
    if (user.ui.viewMode !== 'split') return null
    if (chats.char?.visualType !== 'sprite' && !chats.char?.avatar) return null

    return (
      <section
        data-avatar-container
        ref={container!}
        class="flex items-end justify-center"
        style={{ height: `${viewHeight()}`, 'min-height': viewHeight() }}
      >
        <Show when={chats.char?.visualType === 'sprite'}>
          <AvatarContainer
            container={container!}
            body={chars.botMap[chats.char?._id!]?.sprite}
            expression={express.expr()}
          />
        </Show>
        <Show when={chats.char?.visualType !== 'sprite' && chats.char?.avatar}>
          <div class="flex h-full w-full justify-center">
            <img
              src={chats.char?.avatar!}
              class="flex h-full justify-center rounded-lg object-cover"
            />
          </div>
        </Show>
      </section>
    )
  })

  onCleanup(clearScrollMonitor)

  return (
    <>
      <ModeDetail
        header={<ChatHeader ctx={ctx} isOwner={isOwner()} />}
        footer={
          <ChatFooter
            ctx={ctx}
            isOwner={isOwner()}
            pills={characterPills()}
            requestMessage={requestMessage}
            sendMessage={sendMessage}
            swipe={swipe()}
          />
        }
        loading={!chats.loaded && !chats.chat}
        showPane={showPane()}
        pane={<ChatPanes />}
        split={split()}
        splitHeight={user.ui.viewHeight}
      >
        <section
          data-messages
          class={`mx-auto flex w-full flex-col-reverse gap-4 overflow-y-auto`}
          ref={monitorScroll}
        >
          <div id="chat-messages" class="flex w-full flex-col gap-2">
            <Show when={chats.loaded && chatMsgs().length < 2 && chats.char?.description}>
              <div class="mb-4 flex flex-col items-center text-[var(--text-500)]">
                <div class="font-bold">Notes from the creator of {chats.char?.name}</div>
                {descriptionText()}
              </div>
            </Show>
            <Show when={chats.loaded && chatMsgs().length === 0 && !msgs.waiting}>
              <div class="flex justify-center">
                <Button onClick={generateFirst}>Generate Message</Button>
              </div>
            </Show>
            {/* Original Slot location */}
            <InfiniteScroll canFetch={chars.ready} />

            <Index each={chatMsgs()}>
              {(msg, i) => (
                <>
                  <Message
                    msg={msg()}
                    editing={chats.opts.editing}
                    last={i === indexOfLastRPMessage()}
                    onRemove={() => setRemoveId(msg()._id)}
                    swipe={
                      msg()._id === retries()?.msgId && swipe() > 0 && retries()?.list[swipe()]
                    }
                    confirmSwipe={() => confirmSwipe(msg()._id)}
                    cancelSwipe={cancelSwipe}
                    tts={tts()}
                    retrying={msgs.retrying}
                    partial={msgs.partial}
                    sendMessage={sendMessage}
                    isPaneOpen={pane.showing()}
                    textBeforeGenMore={msgs.textBeforeGenMore}
                    voice={
                      msg()._id === msgs.speaking?.messageId ? msgs.speaking.status : undefined
                    }
                    firstInserted={i === firstInsertedMsgIndex()}
                  >
                    {isOwner() && retries()?.list?.length! > 1 && i === indexOfLastRPMessage() && (
                      <SwipeMessage
                        chatId={chats.chat?._id!}
                        pos={swipe()}
                        prev={clickSwipe(-1)}
                        next={clickSwipe(1)}
                        list={retries()?.list || []}
                      />
                    )}
                  </Message>
                </>
              )}
            </Index>
            <Show when={waitingMsg()}>
              <Message
                msg={waitingMsg()!}
                onRemove={() => {}}
                editing={chats.opts.editing}
                sendMessage={sendMessage}
                isPaneOpen={pane.showing()}
              />
            </Show>
          </div>
        </section>
      </ModeDetail>

      <Show when={chats.opts.modal === 'export'}>
        <ChatExport show={true} close={clearModal} />
      </Show>

      <Show when={chats.opts.modal === 'delete'}>
        <DeleteChatModal show={true} chat={chats.chat!} redirect={true} close={clearModal} />
      </Show>

      <Show when={!!removeId()}>
        <DeleteMsgModal show={!!removeId()} messageId={removeId()} close={() => setRemoveId('')} />
      </Show>

      <Show
        when={
          chats.chat &&
          !chats.chat.genPreset &&
          !chats.chat.genSettings &&
          !user.user?.defaultPreset
        }
      >
        <ForcePresetModal chat={chats.chat!} show={true} close={() => {}} />
      </Show>

      <PromptModal />

      <ConfirmModal
        message={
          <TitleCard type="rose" class="flex flex-col gap-4">
            <div class="flex justify-center font-bold">Are you sure?</div>
            <div>This will delete ALL messages in this conversation.</div>
          </TitleCard>
        }
        show={chats.opts.confirm}
        confirm={() => {
          chatStore.restartChat(chats.chat!._id)
          chatStore.option({ confirm: false })
        }}
        close={() => chatStore.option({ confirm: false })}
      />
    </>
  )
}

let scrollMonitor: any

function monitorScroll(ref: HTMLElement) {
  let bottom = true

  ref.onscroll = (ev) => {
    const pos = ref.scrollTop

    if (pos >= 0) {
      bottom = true
    } else {
      bottom = false
    }
  }

  scrollMonitor = setInterval(() => {
    if (bottom && ref.scrollTop !== 0) {
      ref.scrollTop = 0
    }
  }, 1000 / 30)
}

function clearScrollMonitor() {
  clearInterval(scrollMonitor)
}
