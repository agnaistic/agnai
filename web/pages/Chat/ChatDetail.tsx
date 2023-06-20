import './chat-detail.css'
import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  JSX,
  Match,
  onCleanup,
  Show,
  Switch,
} from 'solid-js'
import { A, useNavigate, useParams } from '@solidjs/router'
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Menu } from 'lucide-solid'
import ChatExport from './ChatExport'
import { ADAPTER_LABELS } from '../../../common/adapters'
import Button from '../../shared/Button'
import { CharacterPill } from '../../shared/CharacterPill'
import IsVisible from '../../shared/IsVisible'
import Modal from '../../shared/Modal'
import { getMaxChatWidth, getRootRgb, setComponentPageTitle } from '../../shared/util'
import {
  characterStore,
  ChatRightPane,
  chatStore,
  settingStore,
  UISettings as UI,
  userStore,
} from '../../store'
import { msgStore } from '../../store'
import { ChatGenSettings } from './ChatGenSettings'
import ChatSettingsModal from './ChatSettings'
import InputBar from './components/InputBar'
import ChatMemoryModal from './components/MemoryModal'
import Message from './components/Message'
import PromptModal from './components/PromptModal'
import DeleteMsgModal from './DeleteMsgModal'
import { DropMenu } from '../../shared/DropMenu'
import UISettings from '../Settings/UISettings'
import { devCycleAvatarSettings, isDevCommand } from './dev-util'
import ChatOptions, { ChatModal } from './ChatOptions'
import MemberModal from './MemberModal'
import { AppSchema } from '../../../srv/db/schema'
import { ImageModal } from './ImageModal'
import { getClientPreset } from '../../shared/adapter'
import ForcePresetModal from './ForcePreset'
import DeleteChatModal from './components/DeleteChat'
import { cycleArray, wait } from '/common/util'
import { getActiveBots } from './util'
import { CreateCharacterForm } from '/web/shared/CreateCharacterForm'
import { usePane } from '/web/shared/hooks'
import CharacterSelect from '/web/shared/CharacterSelect'
import Loading from '/web/shared/Loading'
import Convertible from './Convertible'

const ChatDetail: Component = () => {
  const { updateTitle } = setComponentPageTitle('Chat')
  const params = useParams()
  const nav = useNavigate()
  const user = userStore()
  const cfg = settingStore()
  const chars = characterStore((s) => ({
    chatBots: s.characters.list,
    botMap: s.characters.map,
    impersonate: s.impersonating,
  }))
  const isPaneOrPopup = usePane()

  const chats = chatStore((s) => ({
    ...(s.active?.chat._id === params.id ? s.active : undefined),
    lastId: s.lastChatId,
    members: s.chatProfiles,
    loaded: s.loaded,
    opts: s.opts,
    activeBots: getActiveBots(s.active?.chat!, chars.botMap),
  }))

  const msgs = msgStore((s) => ({
    msgs: s.msgs,
    images: s.images,
    partial: s.partial,
    waiting: s.waiting,
    retries: s.retries,
    speaking: s.speaking,
    retrying: s.retrying,
  }))

  const isGroupChat = createMemo(() => {
    if (!chats.participantIds?.length) return false
    return true
  })

  const isGreetingOnlyMsg = createMemo(() => msgs.msgs.length === 1)
  const botGreeting = createMemo(() => chars.chatBots[0]?.greeting)
  const altGreetings = createMemo(() => chars.chatBots[0]?.alternateGreetings ?? [])

  const retries = createMemo(() => {
    const last = msgs.msgs.slice(-1)[0]
    if (!last && !isGreetingOnlyMsg()) return

    return { msgId: last._id, list: msgs.retries?.[last._id] || [] }
  })

  const [swipe, setSwipe] = createSignal(0)
  const [paneFooter, setPaneFooter] = createSignal<JSX.Element>()
  const [removeId, setRemoveId] = createSignal('')
  const [showOpts, setShowOpts] = createSignal(false)
  const [ooc, setOoc] = createSignal<boolean>()
  const [editId, setEditId] = createSignal('')

  createEffect(() => {
    setEditId(chats.char?._id ?? '')
  })

  const editableCharcters = createMemo(() => {
    const ids = new Map<string, AppSchema.Character>()

    if (chats.char) {
      ids.set(chats.char._id, chats.char)
    }

    if (chars.impersonate) {
      ids.set(chars.impersonate._id, chars.impersonate)
    }

    for (const bot of chats.activeBots) {
      ids.set(bot._id, bot)
    }

    const editable = Array.from(ids.values())
    return editable
  })

  const charBeingEdited = createMemo(() => {
    return chars.chatBots.find((ch) => ch._id === editId())
  })

  const chatMsgs = createMemo(() => {
    return insertImageMessages(msgs.msgs, msgs.images[params.id]).filter((msg) =>
      chats.opts.hideOoc ? !msg.ooc : true
    )
  })

  const isOwner = createMemo(() => chats.chat?.userId === user.user?._id)
  const headerBg = createMemo(() => getHeaderBg(user.ui.mode))
  const chatWidth = createMemo(() =>
    getChatWidth(user.ui.chatWidth, !!chats.opts.pane && isPaneOrPopup() === 'pane')
  )
  const tts = createMemo(() => (user.user?.texttospeech?.enabled ?? true) && !!chats.char?.voice)

  const isSelfRemoved = createMemo(() => {
    if (!user.profile) return false
    if (!chats.chat) return false

    const isMember =
      chats.chat.userId === user.profile.userId ||
      chats.members.some((mem) => mem.userId === user.profile?.userId)

    return !isMember
  })

  const waitingMsg = createMemo(() => {
    if (!msgs.waiting) return
    if (msgs.retrying) return

    return emptyMsg({
      id: 'partial',
      charId: msgs.waiting?.mode !== 'self' ? msgs.waiting.characterId : undefined,
      userId: msgs.waiting?.mode === 'self' ? msgs.waiting.userId || user.user?._id : undefined,
      message: msgs.partial || '',
      adapter: 'partial',
    })
  })

  const setModal = (modal: ChatModal) => {
    setShowOpts(false)
    chatStore.option('modal', modal)
  }

  const clearModal = () => {
    setShowOpts(false)
    chatStore.option('modal', 'none')
  }

  const togglePane = (paneType: ChatRightPane) => {
    setShowOpts(false)
    chatStore.option('pane', chatStore().opts.pane === paneType ? undefined : paneType)
  }

  const closePane = () => {
    chatStore.option('pane', undefined)
  }

  const closeCharEditor = () => {
    closePane()
    setEditId(chats.char?._id || '')
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

  const chatPreset = createMemo(() => getClientPreset(chats.chat))

  const adapterLabel = createMemo(() => {
    const data = chatPreset()
    if (!data) return ''

    const { name, adapter, isThirdParty, presetLabel } = data

    const label = `${ADAPTER_LABELS[adapter]}${isThirdParty ? ' (3rd party)' : ''} - ${
      name || presetLabel
    }`
    return label
  })

  const changeEditingChar = async (char: AppSchema.Character | undefined) => {
    const prev = editId()
    if (prev === char?._id) return

    setEditId('')
    if (!char) return
    await wait(0.2)
    setEditId(char._id)
  }

  createEffect(() => {
    if (isGreetingOnlyMsg() && botGreeting() && altGreetings().length > 0) {
      const currentChoice = msgs.msgs[0].msg
      const allGreetings = [botGreeting(), ...altGreetings()]
      const currentChoiceIndex = allGreetings.findIndex((greeting) => greeting === currentChoice)
      const greetingsWithCurrentChoiceFirst = cycleArray(allGreetings, currentChoiceIndex)
      msgStore.setGreetingSwipes(msgs.msgs[0]._id, greetingsWithCurrentChoiceFirst)
    }
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

  onCleanup(() => {
    closeCharEditor()
  })

  const sendMessage = (message: string, ooc: boolean, onSuccess?: () => void) => {
    if (isDevCommand(message)) {
      switch (message) {
        case '/devCycleAvatarSettings':
          devCycleAvatarSettings(user)
          onSuccess?.()
          return
      }
    }

    // If the number of active bots is 1 or fewer then always request a response
    const botMembers = Object.entries(chats.chat?.characters || {}).reduce(
      (prev, [id, active]) => (active && id !== chats.chat?.characterId ? prev + 1 : prev),
      0
    )
    const kind = ooc ? 'ooc' : chats.replyAs || botMembers === 0 ? 'send' : 'send-noreply'
    if (!ooc) setSwipe(0)
    msgStore.send(chats.chat?._id!, message, kind, onSuccess)
    return
  }

  const moreMessage = () => msgStore.continuation(chats.chat?._id!)

  const requestMessage = (charId: string) => msgStore.request(chats.chat?._id!, charId)

  const cancelSwipe = () => setSwipe(0)

  const confirmSwipe = (msgId: string) => {
    msgStore.confirmSwipe(msgId, swipe(), () => setSwipe(0))
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

  const chatMargin = createMemo(() => ' ' || (!!chats.opts.pane ? 'xs:mr-auto mx-auto' : 'mx-auto'))

  const contentStyles = createMemo((): JSX.CSSProperties => {
    if (chats.opts.pane && isPaneOrPopup() === 'pane') {
      return {
        gap: '4px',
        'justify-self': 'center',
        'flex-direction': 'row',
      }
    }

    return {}
  })

  const msgsMaxWidth = createMemo(() => (chats.opts.pane ? getMaxChatWidth(user.ui.chatWidth) : ''))
  const msgsAndPaneJustifyContent = createMemo(() => {
    if (!chats.opts.pane) return 'justify-center'
    switch (isPaneOrPopup()) {
      case 'popup':
        return 'justify-center'
      case 'pane':
        return 'justify-end'
    }
  })

  return (
    <>
      <Show when={!chats.loaded}>
        <div>
          <div>Loading conversation...</div>
        </div>
      </Show>
      <Show when={chats.chat}>
        <main class="mx-auto flex w-full justify-between gap-4">
          <div
            class={`chat-detail ${chatMargin()} ${chatWidth()} mx-auto flex flex-col pb-1 xs:flex sm:py-2`}
          >
            <header
              class={`hidden h-9 items-center justify-between rounded-md sm:flex`}
              style={headerBg()}
            >
              <div class="ellipsis flex max-w-full cursor-pointer flex-row items-center justify-between gap-4 text-lg font-bold">
                <Show when={!cfg.fullscreen && isOwner()}>
                  <A href={`/character/${chats.char?._id}/chats`}>
                    <ChevronLeft />
                  </A>
                  <div class="ellipsis flex flex-col">
                    <span class="overflow-hidden text-ellipsis whitespace-nowrap leading-5">
                      {chats.char?.name}
                    </span>
                    <Show when={chats.chat!.name}>
                      <span class="flex-row items-center gap-4 overflow-hidden text-ellipsis whitespace-nowrap text-sm">
                        {chats.chat!.name}
                      </span>
                    </Show>
                  </div>
                </Show>
              </div>

              <div class="flex flex-row gap-3">
                <Show when={isOwner()}>
                  <div class="hidden items-center text-xs italic text-[var(--text-500)] sm:flex">
                    {adapterLabel()}
                  </div>
                </Show>

                <div class="" onClick={() => setShowOpts(true)}>
                  <Menu class="icon-button" />
                  <DropMenu
                    show={showOpts()}
                    close={() => setShowOpts(false)}
                    horz="left"
                    vert="down"
                  >
                    <ChatOptions
                      adapterLabel={adapterLabel()}
                      setModal={setModal}
                      togglePane={togglePane}
                    />
                  </DropMenu>
                </div>

                <Show when={!cfg.fullscreen}>
                  <div class="icon-button" onClick={() => settingStore.fullscreen(true)}>
                    <ArrowUpRight />
                  </div>
                </Show>

                <Show when={cfg.fullscreen}>
                  <div class="icon-button" onClick={() => settingStore.fullscreen(false)}>
                    <ArrowDownLeft />
                  </div>
                </Show>
              </div>
            </header>

            <section
              class={`overflow-y-none flex w-full flex-row justify-end gap-1 overflow-y-auto ${msgsAndPaneJustifyContent()}`}
              style={contentStyles()}
            >
              <section
                data-messages
                class={`flex flex-col-reverse gap-4 overflow-y-auto sm:pr-2 ${msgsMaxWidth()} w-full`}
              >
                <div id="chat-messages" class="flex w-full flex-col gap-2">
                  <Show
                    when={
                      cfg.flags.charv2 &&
                      chats.loaded &&
                      chatMsgs().length < 2 &&
                      chats.char?.description
                    }
                  >
                    <div class="mx-auto mb-4 text-[var(--text-500)]">
                      <div class="font-bold">Notes from the creator of {chats.char!.name}:</div>
                      {chats.char!.description!.split('\n').map((paragText) => (
                        <div>{paragText}</div>
                      ))}
                    </div>
                  </Show>
                  <Show when={chats.loaded && chatMsgs().length === 0 && !msgs.waiting}>
                    <div class="flex justify-center">
                      <Button onClick={generateFirst}>Generate Message</Button>
                    </div>
                  </Show>
                  <InfiniteScroll />
                  <For each={chatMsgs()}>
                    {(msg, i) => (
                      <Message
                        msg={msg}
                        botMap={chars.botMap}
                        chat={chats.chat!}
                        char={chats.char!}
                        editing={chats.opts.editing}
                        anonymize={cfg.anonymize}
                        last={i() === indexOfLastRPMessage()}
                        onRemove={() => setRemoveId(msg._id)}
                        swipe={
                          msg._id === retries()?.msgId && swipe() > 0 && retries()?.list[swipe()]
                        }
                        confirmSwipe={() => confirmSwipe(msg._id)}
                        cancelSwipe={cancelSwipe}
                        tts={tts()}
                        retrying={msgs.retrying}
                        partial={msgs.partial}
                        sendMessage={sendMessage}
                        isPaneOpen={!!chatStore().opts.pane}
                      >
                        {isOwner() &&
                          retries()?.list?.length! > 1 &&
                          i() === indexOfLastRPMessage() && (
                            <SwipeMessage
                              chatId={chats.chat?._id!}
                              pos={swipe()}
                              prev={clickSwipe(-1)}
                              next={clickSwipe(1)}
                              list={retries()?.list || []}
                            />
                          )}
                      </Message>
                    )}
                  </For>
                  <Show when={waitingMsg()}>
                    <Message
                      botMap={chars.botMap}
                      msg={waitingMsg()!}
                      char={chars.botMap[waitingMsg()?.characterId!]}
                      chat={chats.chat!}
                      onRemove={() => {}}
                      editing={chats.opts.editing}
                      anonymize={cfg.anonymize}
                      sendMessage={sendMessage}
                      isPaneOpen={!!chatStore().opts.pane}
                    />
                  </Show>
                </div>
              </section>

              <Show when={!!chats.opts.pane}>
                <Switch>
                  <Match when={chats.opts.pane === 'character'}>
                    <Convertible
                      kind="partial"
                      title="Edit Character"
                      close={closeCharEditor}
                      footer={paneFooter()}
                    >
                      <Show when={editId() !== ''}>
                        <CreateCharacterForm
                          chat={chats.chat}
                          editId={editId()}
                          footer={setPaneFooter}
                          close={closeCharEditor}
                        >
                          <Show when={editableCharcters().length > 1}>
                            <CharacterSelect
                              class="w-full"
                              fieldName="editingId"
                              items={editableCharcters()}
                              value={charBeingEdited()}
                              onChange={changeEditingChar}
                            />
                          </Show>
                        </CreateCharacterForm>
                      </Show>

                      <Show when={editId() === ''}>
                        <div class="flex h-full w-full items-center justify-center">
                          <Loading />
                        </div>
                      </Show>
                    </Convertible>
                  </Match>

                  <Match when={chats.opts.pane === 'preset'}>
                    <Convertible
                      kind="partial"
                      title={'Preset Settings'}
                      close={closePane}
                      footer={paneFooter()}
                    >
                      <ChatGenSettings
                        chat={chats.chat!}
                        close={closePane}
                        footer={setPaneFooter}
                      />
                    </Convertible>
                  </Match>
                </Switch>
              </Show>
            </section>
            <Show when={isSelfRemoved()}>
              <div class="flex w-full justify-center">
                You have been removed from the conversation
              </div>
            </Show>
            <Show when={isOwner() && chats.activeBots.length > 1}>
              <div
                class={`flex justify-center gap-2 py-1 ${
                  msgs.waiting ? 'opacity-70 saturate-0' : ''
                }`}
              >
                <For each={chats.activeBots}>
                  {(bot) => (
                    <CharacterPill
                      char={bot}
                      onClick={requestMessage}
                      disabled={!!msgs.waiting}
                      active={chats.replyAs === bot._id}
                    />
                  )}
                </For>
              </div>
            </Show>
            <InputBar
              chat={chats.chat!}
              swiped={swipe() !== 0}
              send={sendMessage}
              more={moreMessage}
              char={chats.char}
              ooc={ooc() ?? isGroupChat()}
              setOoc={setOoc}
              showOocToggle={isGroupChat()}
              request={requestMessage}
              bots={chats.activeBots}
              botMap={chars.botMap}
            />
          </div>
        </main>
      </Show>

      <Show when={chats.opts.modal === 'settings'}>
        <ChatSettingsModal show={true} close={clearModal} />
      </Show>

      <Show when={chats.opts.modal === 'memory'}>
        <ChatMemoryModal chat={chats.chat!} show={!!chats.chat} close={clearModal} />
      </Show>

      <Show when={chats.opts.modal === 'export'}>
        <ChatExport show={true} close={clearModal} />
      </Show>

      <Show when={chats.opts.modal === 'delete'}>
        <DeleteChatModal show={true} chat={chats.chat!} redirect={true} close={clearModal} />
      </Show>

      <Show when={!!removeId()}>
        <DeleteMsgModal show={!!removeId()} messageId={removeId()} close={() => setRemoveId('')} />
      </Show>

      <Show when={chats.opts.modal === 'members'}>
        <MemberModal show={true} close={clearModal} charId={chats?.char?._id!} />
      </Show>

      <ImageModal />

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
      <Show when={chats.opts.modal === 'ui'}>
        <Modal
          show={true}
          close={clearModal}
          title="UI Settings"
          footer={<Button onClick={clearModal}>Close</Button>}
        >
          <UISettings />
        </Modal>
      </Show>
    </>
  )
}

export default ChatDetail

const SwipeMessage: Component<{
  chatId: string
  list: string[]
  prev: () => void
  next: () => void
  pos: number
}> = (props) => {
  return (
    <div class="swipe">
      <div></div>
      <div class="swipe__content">
        <Show when={props.list.length > 1}>
          <div class="cursor:pointer hover:text-[var(--text-900)]">
            <Button schema="clear" class="p-0" onClick={props.prev}>
              <ChevronLeft />
            </Button>
          </div>
          <div class="text-[var(--text-800)]">
            {props.pos + 1} / {props.list.length}
          </div>
          <div class="cursor:pointer hover:text-[var(--text-800)]">
            <Button schema="clear" class="p-0" onClick={props.next}>
              <ChevronRight />
            </Button>
          </div>
        </Show>
      </div>
      <div></div>
    </div>
  )
}

const InfiniteScroll: Component = () => {
  const state = msgStore((s) => ({ loading: s.nextLoading, msgs: s.msgs }))
  const onEnter = () => {
    msgStore.getNextMessages()
  }

  return (
    <Show when={state.msgs.length > 0}>
      <div class="flex w-full justify-center">
        <Show when={!state.loading}>
          <IsVisible onEnter={onEnter} />
        </Show>
        <Show when={state.loading}>
          <div class="dot-flashing bg-[var(--hl-700)]"></div>
        </Show>
      </div>
    </Show>
  )
}

function getChatWidth(setting: UI['chatWidth'], sidePaneVisible: boolean): string {
  if (sidePaneVisible) return 'w-full max-w-full'
  switch (setting) {
    case 'narrow':
      return 'w-full max-w-3xl'

    case 'full':
    default:
      return 'w-full max-w-full'
  }
}

function getHeaderBg(mode: UI['mode']) {
  mode
  const rgb = getRootRgb('bg-900')
  const styles: JSX.CSSProperties = {
    background: rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)` : 'bg-900',
  }
  return styles
}
function emptyMsg(opts: {
  id?: string
  charId?: string
  userId?: string
  adapter?: string
  message: string
}): AppSchema.ChatMessage {
  return {
    kind: 'chat-message',
    _id: opts.id || '',
    chatId: '',
    characterId: opts.charId,
    userId: opts.userId,
    msg: opts.message || '',
    adapter: opts.adapter,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  }
}

function insertImageMessages(
  msgs: AppSchema.ChatMessage[],
  images: AppSchema.ChatMessage[] | undefined
) {
  if (!images?.length) return msgs

  const next: AppSchema.ChatMessage[] = []

  const inserts = images.slice()

  for (const msg of msgs) {
    if (!inserts.length) {
      next.push(msg)
      continue
    }

    do {
      if (!inserts.length) break
      if (msg.createdAt < inserts[0].createdAt) break
      if (msg._id === inserts[0]._id) {
        inserts.shift()
        continue
      }
      next.push(inserts.shift()!)
    } while (true)

    next.push(msg)
  }

  if (inserts.length) {
    next.push(...inserts)
  }

  return next
}
