import { ChevronLeft, ChevronRight } from 'lucide-solid'
import { Component, Show } from 'solid-js'
import Button from '/web/shared/Button'
import { chatStore, msgStore } from '/web/store'
import { AppSchema, UI } from '/common/types'

export const SwipeMessage: Component<{
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

export const LoadMore: Component<{ canFetch?: boolean }> = (props) => {
  const state = msgStore((s) => ({
    msgs: s.msgs,
    history: s.messageHistory,
  }))
  const chat = chatStore((s) => ({ loaded: s.loaded }))

  return (
    <Show when={chat.loaded && state.msgs.length > 0}>
      <div class="flex w-full justify-center">
        <a
          class="link"
          classList={{ hidden: state.history.length === 0 }}
          onClick={() => {
            msgStore.getNextMessages()
          }}
        >
          Load more
        </a>
      </div>
    </Show>
  )
}

export function getChatWidth(
  setting: UI.UISettings['chatWidth'],
  sidePaneVisible: boolean
): string {
  if (sidePaneVisible) return 'w-full max-w-full'
  switch (setting) {
    case 'narrow':
      return 'w-full max-w-3xl'

    case 'full':
    default:
      return 'w-full max-w-full'
  }
}

export function emptyMsg(opts: {
  id?: string
  charId?: string
  userId?: string
  adapter?: string
  handle?: string
  message: string
}): AppSchema.ChatMessage & { handle?: string } {
  return {
    kind: 'chat-message',
    _id: opts.id || '',
    chatId: '',
    characterId: opts.charId,
    userId: opts.userId,
    msg: opts.message || '',
    retries: [],
    adapter: opts.adapter,
    handle: opts.handle,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  }
}

export function insertImageMessages(
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
