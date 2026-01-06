import { Component, Show } from 'solid-js'
import Message from './Message'
import { PresetContext } from '/web/store/preset-context'
import { ContextState } from '/web/store/context'
import { responseStore } from '/web/store'

export const PendingMessages: Component<{
  ctx: ContextState
  impersonateId?: string
  userId?: string
  handle: string
  isPaneOpen: boolean
  preset: PresetContext
}> = (props) => {
  const response = responseStore((s) => ({
    waiting: s.waiting,
    partial: s.partial,
    retrying: s.retrying,
  }))

  return (
    <>
      <Show when={props.ctx.flags.debug && false}>
        <div class="flex flex-col">
          <div>
            Retrying: <code>{(!!response.retrying).toString()}</code>
          </div>
          <div>
            Waiting: <code>{(!!response.waiting).toString()}</code>
          </div>
          <div>
            Chat ID:{' '}
            <code>
              {(!!response.waiting && response.waiting.chatId === props.ctx.chat?._id).toString()}
            </code>
          </div>
        </div>
      </Show>
      <Show
        when={
          !response.retrying &&
          !!response.waiting &&
          response.waiting.chatId === props.ctx.chat?._id
        }
      >
        <Message
          index={-1}
          messageId={'partial-response'}
          content={response.partial?.tokens || ''}
          last={true}
          onRemove={noop}
          swipe={false}
          confirmSwipe={noop}
          partial={response.partial}
          cancelSwipe={noop}
          discardSwipe={noop}
          handle={props.ctx.allBots[response.waiting?.characterId || '']?.name || '...'}
          tts={false}
          characterId={response.waiting?.characterId}
          userId={response.waiting?.userId}
          sendMessage={noop}
          isPaneOpen={props.isPaneOpen}
          preset={props.preset}
          canUseAttachments={false}
          editing={false}
        ></Message>
      </Show>
    </>
  )
}

function noop() {}
