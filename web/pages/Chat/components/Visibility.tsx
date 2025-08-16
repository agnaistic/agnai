import { Component, createMemo, createSignal, For, onMount, Show } from 'solid-js'
import { ContextState } from '/web/store/context'
import Modal from '/web/shared/Modal'
import { chatStore, msgStore } from '/web/store'
import { useParticipantList } from '../MemberModal'
import { AppSchema } from '/common/types'
import { CharacterAvatar } from '/web/shared/AvatarIcon'
import Button from '/web/shared/Button'
import { Pill } from '/web/shared/Card'
import { Check, X } from 'lucide-solid'

export const MessageVisibility: Component<{ ctx: ContextState; messageId: string }> = (props) => {
  const lists = useParticipantList()
  const [flags, setFlags] = createSignal<Record<string, boolean>>({})

  const currents = createMemo(() => {
    const msg = flags()
    const chat = props.ctx.chat?.invisible || {}
    const all = lists()
      .chars.concat(lists().tempsActive)
      .map((char) => {
        const invis = msg[char._id] ?? chat[char._id] ?? false

        return { char, invis }
      })

    return all
  })

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
      <div class="flex flex-col gap-2">
        <div class="flex flex-col">
          <span class="text-500 text-sm">Current</span>
          <div class="flex flex-wrap gap-2">
            <For each={currents()}>
              {(char) => <CurrentToggle char={char.char} invisible={char.invis} />}
            </For>
          </div>
        </div>

        <div class="flex flex-col">
          <span class="text-500 text-sm">Toggles for this message</span>
          <div class="flex flex-wrap gap-1">
            <Button onClick={() => setFlags({})} class="!text-md !py-1">
              Use Defaults
            </Button>
            <For each={lists().chars}>
              {(char) => (
                <VisibilityToggle
                  char={char}
                  invisible={flags()[char._id]}
                  onClick={() => toggle(char._id)}
                />
              )}
            </For>

            <For each={lists().tempsActive}>
              {(char) => (
                <VisibilityToggle
                  char={char}
                  invisible={flags()[char._id]}
                  onClick={() => toggle(char._id)}
                />
              )}
            </For>
          </div>
        </div>

        <div class="flex flex-col">
          <span class="text-500 text-sm">Meanings</span>
          <div class="flex flex-wrap gap-1">
            <div class="rounded-md bg-[var(--green-800)] p-1">Visible</div>
            <div class="bg-900 rounded-md border-[1px] border-[var(--bg-700)] p-1">
              Using Chat Default
            </div>
            <div class="rounded-md bg-[var(--error-800)] p-1">Invisible</div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

const CurrentToggle: Component<{ char: AppSchema.Character; invisible: boolean | undefined }> = (
  props
) => {
  return (
    <>
      <Show when={props.invisible}>
        <Pill type="bg" opacity={0.1}>
          <CharacterAvatar
            bot
            format={{ size: 'xs', corners: 'circle' }}
            char={props.char as any}
          />
          <strong class="text-900 ml-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap pr-1">
            {props.char.name}
          </strong>
          <X size={20} color="var(--error-500)" />
        </Pill>
      </Show>
      <Show when={!props.invisible}>
        <Pill type="bg" opacity={0.1}>
          <CharacterAvatar
            bot
            format={{ size: 'xs', corners: 'circle' }}
            char={props.char as any}
          />
          <strong class="text-900 ml-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap pr-1">
            {props.char.name}
          </strong>
          <Check size={20} color="var(--success-500)" />
        </Pill>
      </Show>
    </>
  )
}

export const VisibilityToggle: Component<{
  char: AppSchema.Character
  invisible: boolean | undefined
  onClick: () => void
}> = (props) => {
  return (
    <div
      class={`character-reply-btn flex max-w-[200px] cursor-pointer select-none items-center overflow-hidden rounded-md border-[1px] border-[var(--bg-700)] px-2 py-1  `}
      onclick={props.onClick}
      classList={{
        'bg-900 hover:bg-[var(--bg-700)]': props.invisible === undefined,
        'bg-[var(--green-800)] hover:bg-[var(--green-600)]': props.invisible === false,
        'bg-[var(--error-800)] hover:bg-[var(--error-600)]': props.invisible === true,
      }}
    >
      <CharacterAvatar bot format={{ size: 'xs', corners: 'circle' }} char={props.char as any} />
      <strong class="ml-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap pr-1">
        {props.char.name}
      </strong>
    </div>
  )
}
