import { Component, createMemo, createSignal, For, Show } from 'solid-js'
import { CircleX, VenetianMask } from 'lucide-solid'
import Button from '../../shared/Button'
import { CharacterPill } from '../../shared/CharacterPill'
import { characterStore, chatStore, settingStore, userStore } from '../../store'
import { msgStore } from '../../store'
import InputBar from './components/InputBar'
import { ContextState } from '/web/store/context'
import { AppSchema } from '/common/types'

export const ChatFooter: Component<{
  ctx: ContextState
  isOwner: boolean
  pills: AppSchema.Character[]
  swipe: number
  requestMessage: (chatId: string) => void
  sendMessage: (message: string, ooc: boolean, onSucces?: () => void) => void
}> = (props) => {
  const user = userStore()
  const msgs = msgStore((s) => ({ waiting: s.waiting, attachments: s.attachments }))
  const chars = characterStore((s) => ({ botMap: s.characters.map }))
  const chats = chatStore((s) => ({
    opts: s.opts,
    char: s.active?.char,
    chat: s.active?.chat,
    replyAs: s.active?.replyAs,
    participantIds: s.active?.participantIds,
    members: s.chatProfiles,
  }))

  const [ooc, setOoc] = createSignal<boolean>()
  const attachment = createMemo(() => {
    if (!props.ctx.chat) return
    const attachment = msgs.attachments[props.ctx.chat._id]
    if (!attachment) return
    return attachment.image
  })

  const isGroupChat = createMemo(() => {
    if (!chats.participantIds?.length) return false
    return true
  })

  const isSelfRemoved = createMemo(() => {
    if (!user.profile) return false
    if (!chats.chat) return false

    const isMember =
      chats.chat.userId === user.profile.userId ||
      chats.members.some((mem) => mem.userId === user.profile?.userId)

    return !isMember
  })

  const moreMessage = () => msgStore.continuation(chats.chat?._id!)

  return (
    <div class="mb-2 flex w-full flex-col">
      <Show when={isSelfRemoved()}>
        <div class="flex w-full max-w-full justify-center">
          You have been removed from the conversation
        </div>
      </Show>
      <Show when={props.isOwner && props.ctx.activeBots.length > 1 && !!chats.chat}>
        <div
          class={`flex max-h-[42px] min-h-[42px] flex-wrap justify-center gap-2 overflow-y-auto py-1 ${
            msgs.waiting ? 'opacity-70 saturate-0' : ''
          }`}
        >
          <Button
            size="md"
            schema="bordered"
            onClick={() => settingStore.toggleImpersonate(true)}
            classList={{ 'impersonate-btn': true }}
          >
            <VenetianMask size={16} />
          </Button>
          <For each={props.pills}>
            {(bot) => (
              <CharacterPill
                char={bot}
                onClick={props.requestMessage}
                disabled={!!msgs.waiting}
                active={chats.replyAs === bot._id}
              />
            )}
          </For>
        </div>
      </Show>
      <Show when={!!chats.chat}>
        <Show when={!!attachment()}>
          <div class="flex h-[40x] items-center gap-2 pl-4">
            <img src={attachment()} class="h-[40px] rounded-md" />
            <div class="icon-button">
              <CircleX size={16} onClick={() => msgStore.removeAttachment(props.ctx?.chat?._id!)} />
            </div>
          </div>
        </Show>
        <InputBar
          chat={chats.chat!}
          swiped={props.swipe !== 0}
          send={props.sendMessage}
          more={moreMessage}
          char={chats.char}
          ooc={ooc() ?? isGroupChat()}
          setOoc={setOoc}
          showOocToggle={isGroupChat()}
          request={props.requestMessage}
          bots={props.ctx.activeBots}
          botMap={chars.botMap}
        />
      </Show>
    </div>
  )
}
