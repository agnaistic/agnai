import './chat-detail.css'
import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  Index,
  on,
  onCleanup,
  Show,
} from 'solid-js'
import { useNavigate, useParams } from '@solidjs/router'
import ChatExport from './ChatExport'
import Button from '../../shared/Button'
import { getAssetUrl, setComponentPageTitle, sticky } from '../../shared/util'
import {
  characterStore,
  chatStore,
  pageStore,
  presetStore,
  responseStore,
  userStore,
} from '../../store'
import { msgStore } from '../../store'
import Message from './components/Message'
import PromptModal from './components/PromptModal'
import DeleteMsgModal from './DeleteMsgModal'
import { devCycleAvatarSettings, isDevCommand } from './dev-util'
import ForcePresetModal from './ForcePreset'
import DeleteChatModal from './components/DeleteChat'
import { useEffect, usePaneManager } from '/web/shared/hooks'
import { LoadMore, SwipeMessage } from './helpers'
import { useAutoExpression } from '/web/shared/Avatar/hooks'
import AvatarContainer from '/web/shared/Avatar/Container'
import { eventStore } from '/web/store/event'
import ChatPanes, { useValidChatPane } from './components/ChatPanes'
import { useAppContext } from '/web/store/context'
import { embedApi } from '/web/store/embeddings'
import { ModeDetail } from '/web/shared/Mode/Detail'
import { ChatMenu } from './ChatMenu'
import { ChatFooter } from './ChatFooter'
import { ConfirmModal } from '/web/shared/Modal'
import { TitleCard } from '/web/shared/Card'
import { ChatGraphModal } from './components/GraphModal'
import { EVENTS, events } from '/web/emitter'
import { canStartTour, startTour } from '/web/tours'
import { MessageMeta } from './components/MessageMeta'
import { usePresetContext } from '/web/store/preset-context'
import { SendFunc } from './components/InputBar'
import { MessageVisibility } from './components/Visibility'
import { PendingMessages } from './components/Pending'

export { ChatDetail as default }

const ChatDetail: Component = () => {
  const { updateTitle } = setComponentPageTitle('Chat')

  let container: HTMLDivElement

  const params = useParams()
  const pane = usePaneManager()

  const nav = useNavigate()
  const user = userStore((s) => ({ ui: s.ui, profile: s.profile, user: s.user }))
  const chars = characterStore((s) => ({
    botMap: s.characters.map,
    ready: s.characters.loaded > 0 && s.chatChars.chatId === params.id,
  }))

  const [ctx] = useAppContext()
  const [_, presetSet] = usePresetContext()

  const chats = chatStore((s) => ({
    ...(s.active?.chat._id === params.id ? s.active : undefined),
    lastId: s.lastChatId,
    members: s.chatProfiles,
    loaded: s.detailLoaded,
    loading: s.detailLoading,
    opts: s.opts,
    linesAddedCount: s.prompt?.template.linesAddedCount,
    msgVisibility: s.msgVisibility,
    listChat: s.allChats.find((chat) => chat._id === params.id),
  }))

  const response = responseStore((s) => ({
    partial: s.partial,
    waiting: s.waiting,
    retrying: s.retrying,
    speaking: s.speaking,
  }))

  const msgs = msgStore((s) => ({
    msgs: s.msgs,
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

  const chatMsgs = createMemo(() => {
    if (!chats.chat || !chats.char) return []

    const doShowHiddenEvents = showHiddenEvents()

    const filtered = msgs.msgs.filter((msg) => {
      if (chats.opts.hideOoc && msg.ooc) return false
      if (msg.event === 'hidden' && !doShowHiddenEvents) return false
      return true
    })

    return filtered
  })

  onCleanup(() => {
    sticky.clear()
    events.emit('chat-closed')
  })

  createEffect(
    on(
      () => [msgs.msgs, chats.chat, chats.char],
      () => {
        // On Connect Events
        if (evented() || !chats.chat || !chats.char || !chars.ready) return
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
      }
    )
  )

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
  const tts = createMemo(
    () => (user.user?.texttospeech?.enabled ?? true) && !!chats.char?.voice?.service
  )

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

  createEffect(
    on(
      () => params.id,
      () => {
        if (!params.id) {
          if (!chats.lastId) return nav('/character/list')
          return nav(`/chat/${chats.lastId}`)
        }

        if (params.id !== chats.chat?._id) {
          chatStore.openChat(params.id, {
            onDone: async (success, chat) => {
              if (success && chat) {
                await Promise.all([presetSet.loadChat(chat, true), presetStore.getTemplates(true)])
                return
              }

              // If the chat fails to load, return to the chat list
              nav('/chats')
            },
          })
        } else {
          characterStore.loadImpersonate()
        }
      }
    )
  )

  createEffect(() => {
    const charName = chats.char?.name
    updateTitle(charName ? `Chat with ${charName || '...'}` : 'Chat')

    if (charName && canStartTour('chat')) {
      pageStore.menu(true)
      setTimeout(() => {
        startTour('chat')
      }, 500)
    }

    events.emit(EVENTS.chatOpened, params.id)
  })

  const sendMessage: SendFunc = (opts) => {
    if (isDevCommand(opts.msg)) {
      switch (opts.msg) {
        case '/devCycleAvatarSettings':
          devCycleAvatarSettings(user.ui)
          opts.onSuccess?.()
          return

        case '/devShowHiddenEvents':
          setShowHiddenEvents(!showHiddenEvents())
          break
      }
    }

    // If the number of active bots is 1 or fewer then always request a response
    const kind = opts.ooc
      ? 'ooc'
      : chats.replyAs || ctx.activeBots.length <= 1
      ? 'send'
      : 'send-noreply'
    if (!opts.ooc) setSwipe(0)

    responseStore.send({
      chatId: chats.chat?._id!,
      msg: opts.msg,
      mode: kind,
      onSuccess: opts.onSuccess,
      onError: opts.onError,
    })
    return
  }

  const requestMessage = (charId: string) => responseStore.request(chats.chat?._id!, charId)
  const cancelSwipe = () => setSwipe(0)

  const confirmSwipe = (msgId: string) => {
    msgStore.confirmSwipe(msgId, swipe(), () => {
      setSwipe(0)
    })
  }

  const discardSwipe = (msgId: string, index: number) => {
    msgStore.discardSwipe(msgId, index, () => {
      setSwipe(Math.max(index - 1, 0))
    })
  }

  const indexOfLastRPMessage = createMemo(() => {
    const msgs = chatMsgs()

    for (let i = msgs.length - 1; i >= 0; i--) {
      const curr = msgs[i]
      if (!curr.ooc && curr.adapter !== 'image') {
        return i
      }
    }

    return -1
  })

  const generateFirst = () => {
    responseStore.retry({ chatId: chats.chat?._id! })
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
      // console.log({ alt: ev.altKey, ctrl: ev.ctrlKey, meta: ev.metaKey, key: ev.key, code: ev.code })
      const isModifier = ev.altKey && !ev.shiftKey
      if (!isModifier) return

      const num = +ev.key
      if (num >= 1) {
        const pill = characterPills()[num - 1]
        if (!pill) return

        ev.preventDefault()
        if (response.retrying || response.partial) return
        requestMessage(pill._id)
      }

      if (ev.key === 'r' || ev.code === 'KeyR') {
        ev.preventDefault()
        if (response.retrying || response.partial) return
        const last = indexOfLastRPMessage()
        const msg = msgs.msgs[last]
        if (!msg) return
        if (msg.adapter === 'image') {
          msgStore.createImage({ sourceMsgId: msg._id })
        } else if (msg.characterId) {
          responseStore.retry({ chatId: msg.chatId, msgId: msg._id })
        } else {
          if (!ctx.chat?.characterId) return
          responseStore.request(msg.chatId, ctx.chat.characterId)
          // msgStore.resend(msg.chatId, msg._id)
        }
      }

      if (ev.key === 'i' || ev.code === 'KeyI') {
        ev.preventDefault()
        pageStore.toggleImpersonate(true)
      }

      if (ev.key === 'a' || ev.code == 'KeyA') {
        ev.preventDefault()
        const last = indexOfLastRPMessage()
        const msg = msgs.msgs[last]
        if (!msg?.characterId) return

        responseStore.request(msg.chatId, msg.characterId)
      }

      if (ev.key === 'g' || ev.key === 'KeyG') {
        ev.preventDefault()
        chatStore.option({ options: false, modal: 'graph' })
      }

      if (ev.key === 'p' || ev.key === 'KeyP') {
        ev.preventDefault()
        msgStore.createImage({})
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
              src={getAssetUrl(chats.char?.avatar!)}
              class="flex h-full justify-center rounded-lg object-cover"
            />
          </div>
        </Show>
      </section>
    )
  })

  return (
    <>
      <ChatMenu ctx={ctx} isOwner={isOwner()} />
      <ModeDetail
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
          class={`chat-messages flex w-full flex-col-reverse gap-4 overflow-y-auto`}
          ref={sticky.monitor}
        >
          <div id="chat-messages" class="flex w-full flex-col gap-2">
            <Show when={chats.loaded && chatMsgs().length < 2 && chats.char?.description}>
              <div class="mb-4 flex flex-col items-center text-[var(--text-500)]">
                <div class="font-bold">Notes from the creator of {chats.char?.name}</div>
                {descriptionText()}
              </div>
            </Show>
            <Show when={chats.loaded && chatMsgs().length === 0 && !response.waiting}>
              <div class="flex justify-center gap-2">
                <Button onClick={generateFirst}>Generate Message</Button>
              </div>
            </Show>
            {/* Original Slot location */}
            <LoadMore canFetch={chars.ready} />

            <Index each={chatMsgs()}>
              {(msg, i) => (
                <>
                  <Message
                    index={i}
                    messageId={msg()._id}
                    content={msg().msg}
                    editing={chats.opts.editing}
                    last={i === indexOfLastRPMessage()}
                    onRemove={() => setRemoveId(msg()._id)}
                    swipe={
                      msg()._id === retries()?.msgId && swipe() > 0 && retries()?.list[swipe()]
                    }
                    confirmSwipe={() => confirmSwipe(msg()._id)}
                    cancelSwipe={cancelSwipe}
                    discardSwipe={() => discardSwipe(msg()._id, swipe())}
                    tts={tts()}
                    retrying={response.retrying}
                    partial={response.partial}
                    characterId={msg().characterId}
                    userId={msg().userId}
                    sendMessage={sendMessage}
                    isPaneOpen={pane.showing()}
                    textBeforeGenMore={msgs.textBeforeGenMore}
                    preset={_}
                    canUseAttachments={presetSet.context.attachments}
                    voice={
                      msg()._id === response.speaking?.messageId
                        ? response.speaking.status
                        : undefined
                    }
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

            <PendingMessages
              ctx={ctx}
              userId={ctx.user?._id}
              impersonateId={ctx.impersonate?._id}
              preset={_}
              isPaneOpen={pane.showing()}
              handle={ctx.impersonate?.name || ctx.profile?.handle || 'You'}
            />

            {/* <Show when={waitingMsg()?.input}>
              <Message
                index={-1}
                messageId={waitingMsg()!.input!._id}
                content={waitingMsg()!.input!.msg}
                editing={chats.opts.editing}
                last={-1 === indexOfLastRPMessage()}
                onRemove={() => setRemoveId(waitingMsg()!.input!._id)}
                swipe={
                  waitingMsg()!.input!._id === retries()?.msgId &&
                  swipe() > 0 &&
                  retries()?.list[swipe()]
                }
                confirmSwipe={() => confirmSwipe(waitingMsg()!.input!._id)}
                cancelSwipe={cancelSwipe}
                discardSwipe={() => discardSwipe(waitingMsg()!.input!._id, swipe())}
                tts={tts()}
                retrying={msgs.retrying}
                characterId={waitingMsg()!.input!.characterId}
                userId={waitingMsg()!.input!.userId}
                sendMessage={sendMessage}
                isPaneOpen={pane.showing()}
                textBeforeGenMore={msgs.textBeforeGenMore}
                preset={_}
                canUseAttachments={presetSet.context.attachments}
                voice={
                  waitingMsg()!.input!._id === msgs.speaking?.messageId
                    ? msgs.speaking.status
                    : undefined
                }
              ></Message>
            </Show>

            <Show when={waitingMsg()?.response}>
              <Message
                index={-1}
                messageId={waitingMsg()!.response!._id}
                content={waitingMsg()!.response!.msg}
                editing={chats.opts.editing}
                last={-1 === indexOfLastRPMessage()}
                onRemove={() => setRemoveId(waitingMsg()!.response!._id)}
                swipe={
                  waitingMsg()!.response!._id === retries()?.msgId &&
                  swipe() > 0 &&
                  retries()?.list[swipe()]
                }
                confirmSwipe={() => confirmSwipe(waitingMsg()!.response!._id)}
                cancelSwipe={cancelSwipe}
                discardSwipe={() => discardSwipe(waitingMsg()!.response!._id, swipe())}
                tts={tts()}
                retrying={msgs.retrying}
                partial={msgs.partial}
                characterId={waitingMsg()!.response!.characterId}
                userId={waitingMsg()!.response!.userId}
                sendMessage={sendMessage}
                isPaneOpen={pane.showing()}
                textBeforeGenMore={msgs.textBeforeGenMore}
                preset={_}
                canUseAttachments={presetSet.context.attachments}
                voice={
                  waitingMsg()!.response!._id === msgs.speaking?.messageId
                    ? msgs.speaking.status
                    : undefined
                }
              ></Message>
            </Show> */}
          </div>
        </section>
      </ModeDetail>

      <Show when={chats.opts.modal === 'export'}>
        <ChatExport show={true} close={clearModal} />
      </Show>

      <Show when={chats.opts.modal === 'graph'}>
        <ChatGraphModal
          tree={ctx.chatTree}
          show
          close={clearModal}
          leafId={chatMsgs().slice(-1)[0]?._id || ''}
        />
      </Show>

      <Show when={chats.opts.modal === 'delete'}>
        <DeleteChatModal show={true} chat={chats.chat!} redirect={true} close={clearModal} />
      </Show>

      <Show when={!!removeId()}>
        <DeleteMsgModal show={!!removeId()} messageId={removeId()} close={() => setRemoveId('')} />
      </Show>

      <MessageMeta />
      <Show when={chats.msgVisibility?.id}>
        <MessageVisibility ctx={ctx} messageId={chats.msgVisibility?.id!} />
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
            <div>This will fork your conversation from the greeting message.</div>
          </TitleCard>
        }
        show={chats.opts.modal === 'restart'}
        confirm={() => {
          msgStore.fork('root')
          chatStore.option({ modal: 'none' })
        }}
        close={() => chatStore.option({ modal: 'none' })}
      />
    </>
  )
}
