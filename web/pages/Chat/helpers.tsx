import { ChevronLeft, ChevronRight } from 'lucide-solid'
import { Component, JSX, Show, createSignal, onMount } from 'solid-js'
import Button from '/web/shared/Button'
import { chatStore, msgStore } from '/web/store'
import IsVisible from '/web/shared/IsVisible'
import { AppSchema, UI } from '/common/types'
import { createDebounce, getRootRgb } from '/web/shared/util'

const [onEnter] = createDebounce((loading: boolean) => {
  if (loading) return
  msgStore.getNextMessages()
}, 250)

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

export const InfiniteScroll: Component<{ canFetch?: boolean }> = (props) => {
  const state = msgStore((s) => ({ loading: s.nextLoading, msgs: s.msgs }))
  const chat = chatStore((s) => ({ loaded: s.loaded }))
  const [ready, setReady] = createSignal(false)

  onMount(() => {
    setTimeout(() => {
      setReady(true)
    }, 1500)
  })

  return (
    <Show when={chat.loaded && state.msgs.length > 0 && ready()}>
      <div class="flex h-[1px] w-full justify-center overflow-hidden">
        <Show when={!state.loading}>
          <IsVisible
            onEnter={() => {
              if (!props.canFetch) return
              onEnter(state.loading)
            }}
          />
        </Show>
        <Show when={state.loading}>
          <div class="dot-flashing bg-[var(--hl-700)]"></div>
        </Show>
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

export function getHeaderBg(mode: UI.UISettings['mode']) {
  mode
  const rgb = getRootRgb('bg-900')
  const styles: JSX.CSSProperties = {
    background: rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)` : 'bg-900',
  }
  return styles
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
