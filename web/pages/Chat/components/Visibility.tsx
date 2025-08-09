import { Component, createMemo, createSignal, For, onMount, Show } from 'solid-js'
import { ContextState } from '/web/store/context'
import Modal from '/web/shared/Modal'
import { chatStore, msgStore } from '/web/store'
import { useParticipantList } from '../MemberModal'
import { AppSchema } from '/common/types'
import { CharacterAvatar } from '/web/shared/AvatarIcon'
import Button from '/web/shared/Button'
import { Pill } from '/web/shared/Card'

export const MessageVisibility: Component<{ ctx: ContextState; messageId: string }> = (props) => {
  const lists = useParticipantList()

  const [flags, setFlags] = createSignal<Record<string, boolean>>({})

  const message = createMemo(() => {
    return props.ctx.chatTree[props.messageId]?.msg
  })

  onMount(() => {
    const msg = props.ctx.chatTree[props.messageId]
    if (!msg) setFlags({})

    setFlags(msg.msg.invisible ? { ...msg.msg.invisible } : {})
  })

  const toggle = (charId: string) => {
    const next = { ...flags() }
    const flag = next[charId] === undefined ? true : !next[charId]
    next[charId] = flag
    setFlags(next)
  }

  const close = () => chatStore.toggleMsgVisibility()

  const save = () => {
    msgStore.editMessageProp(props.messageId, { invisible: flags() })
    close()
  }

  const showWarning = createMemo(() => {
    const body = flags()
    const keys = Object.keys(body)

    return keys.length === 0
  })

  return (
    <Modal
      show={!!message()}
      title="Message Visibility"
      close={close}
      footer={
        <>
          <Button schema="secondary" onClick={close}>
            Cancel
          </Button>

          <Button schema="success" onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <Show when={showWarning()}>
        <div class="flex justify-center">
          <Pill class="!py-1" type="premium">
            Using defaults from Chat Settings
          </Pill>
        </div>
      </Show>
      <p>
        <b>Green</b>: Can see this message when replying
      </p>

      <div class="flex flex-wrap gap-2">
        <Button onClick={() => setFlags({})} size="md">
          Use Defaults
        </Button>
        <For each={lists().chars}>
          {(char) => (
            <VisibilityToggle
              char={char}
              invisible={!!flags()[char._id]}
              onClick={() => toggle(char._id)}
            />
          )}
        </For>

        <For each={lists().tempsActive}>
          {(char) => (
            <VisibilityToggle
              char={char}
              invisible={!!flags()[char._id]}
              onClick={() => toggle(char._id)}
            />
          )}
        </For>
      </div>
    </Modal>
  )
}

export const VisibilityToggle: Component<{
  char: AppSchema.Character
  invisible: boolean
  onClick: () => void
}> = (props) => {
  return (
    <div
      class={`character-reply-btn flex max-w-[200px] cursor-pointer items-center overflow-hidden rounded-md border-[1px] border-[var(--bg-700)] px-2 py-1  `}
      onclick={props.onClick}
      classList={{
        'bg-900 hover:bg-[var(--bg-700)]': props.invisible,
        'bg-[var(--green-800)] hover:bg-[var(--green-600)]': !props.invisible,
      }}
    >
      <CharacterAvatar bot format={{ size: 'xs', corners: 'circle' }} char={props.char as any} />
      <strong class="ml-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap pr-1">
        {props.char.name}
      </strong>
    </div>
  )
}
