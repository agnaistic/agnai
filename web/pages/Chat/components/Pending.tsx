import { Component, Show } from 'solid-js'
import Message from './Message'
import { PresetState } from '/web/store/preset-context'
import { ContextState } from '/web/store/context'
import { responseStore } from '/web/store'

export const PendingMessages: Component<{
  ctx: ContextState
  impersonateId?: string
  userId?: string
  handle: string
  isPaneOpen: boolean
  preset: PresetState
}> = (props) => {
  const response = responseStore((s) => ({
    waiting: s.waiting,
    partial: s.partial,
    retrying: s.retrying,
  }))

  return (
    <>
      <Show when={!response.retrying && !!response.waiting?.input}>
        <Message
          index={-1}
          messageId={'partial-input'}
          content={response.waiting?.input || ''}
          last={false}
          onRemove={noop}
          swipe={false}
          confirmSwipe={noop}
          cancelSwipe={noop}
          discardSwipe={noop}
          tts={false}
          characterId={props.impersonateId}
          userId={props.userId}
          sendMessage={noop}
          isPaneOpen={props.isPaneOpen}
          preset={props.preset}
          canUseAttachments={false}
          editing={false}
          handle={props.handle}
        ></Message>
      </Show>

      <Show when={!response.retrying && !!response.waiting}>
        <Message
          index={-1}
          messageId={'partial-response'}
          content={response.partial || ''}
          last={true}
          onRemove={noop}
          swipe={false}
          confirmSwipe={noop}
          partial={response.partial}
          cancelSwipe={noop}
          discardSwipe={noop}
          handle={
            response.waiting?.mode !== 'self'
              ? props.ctx.allBots[response.waiting?.characterId || '']?.name
              : '???'
          }
          tts={false}
          characterId={
            response.waiting?.mode !== 'self' ? response.waiting?.characterId : props.impersonateId
          }
          userId={
            response.waiting?.mode === 'self' ? response.waiting.userId || props.userId : undefined
          }
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
