import { Component, createMemo, createSignal, For, Show } from 'solid-js'
import { CircleX, Dices, VenetianMask } from 'lucide-solid'
import Button from '../../shared/Button'
import { CharacterPill } from '../../shared/CharacterPill'
import { characterStore, chatStore, settingStore, userStore } from '../../store'
import { msgStore } from '../../store'
import InputBar, { SendFunc } from './components/InputBar'
import { ContextState } from '/web/store/context'
import { AppSchema } from '/common/types'

export const ChatFooter: Component<{
  ctx: ContextState
  isOwner: boolean
  pills: AppSchema.Character[]
  swipe: number
  requestMessage: (characterId: string) => void
  sendMessage: SendFunc
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
  const attachments = createMemo(() => {
    if (!props.ctx.chat) return
    const atts = msgs.attachments[props.ctx.chat._id]
    if (!atts) return

    return atts.map((a) => a.image)
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

  const requestRandom = () => {
    const index = Math.floor(Math.random() * props.pills.length)
    const bot = props.pills[index]

    if (bot) {
      props.requestMessage(bot._id)
    }
  }

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

          <Button size="md" schema="bordered" onClick={requestRandom}>
            <Dices size={16} />
          </Button>
        </div>
      </Show>
      <Show when={!!chats.chat}>
        <Show when={!!attachments()?.length}>
          <div class="flex h-[40x] items-center gap-2 pl-4">
            <For each={attachments()}>
              {(image) => (
                <img
                  src={image}
                  class="h-[40px] cursor-pointer rounded-md"
                  onClick={() => settingStore.showImage({ src: { type: 'url', id: image } })}
                />
              )}
            </For>

            <div class="icon-button">
              <CircleX
                size={16}
                onClick={() => msgStore.removeAttachment(props.ctx?.chat?._id!, -1)}
              />
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
