import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  Match,
  on,
  onMount,
  Show,
  Switch,
} from 'solid-js'
import { ContextState } from '/web/store/context'
import Modal from '/web/shared/Modal'
import { chatStore, msgStore } from '/web/store'
import { ParticipantList, useParticipantList } from '../util'
import { AppSchema } from '/common/types'
import { CharacterAvatar } from '/web/shared/AvatarIcon'
import Button from '/web/shared/Button'
import { Pill, TitleCard } from '/web/shared/Card'
import { Check, Minus, X } from 'lucide-solid'
import { isMessageInvisible } from '/common/prompt'

export const MessageVisibility: Component<{ ctx: ContextState; messageId: string }> = (props) => {
  const lists = useParticipantList()
  const [flags, setFlags] = createSignal<Record<string, boolean | undefined>>({})

  const currents = createMemo(() => {
    const all = lists()
      .chars.concat(lists().tempsActive)
      .map((char) => {
        const invis = isMessageInvisible(
          props.ctx.chat!,
          props.ctx.chatTree[props.messageId]?.msg!,
          char._id
        )

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
    const flag = next[charId] === undefined ? true : next[charId] === false ? undefined : false
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

export const CharacterDefaultVisibility: Component<{
  chat: AppSchema.Chat
  participants: ParticipantList
}> = (props) => {
  const [flags, setFlags] = createSignal<Record<string, Record<string, boolean | undefined>>>({})

  createEffect(
    on(
      () => [props.chat],
      () => {
        setFlags(props.chat?.invisibleChars ? { ...props.chat.invisibleChars } : {})
      }
    )
  )

  const toggle = (perspectiveId: string, authorId: string) => {
    const next = { ...flags() }
    const perspective = { ...next[perspectiveId] }

    const curr = perspective[authorId]
    const flag = curr === undefined ? true : curr === false ? undefined : false

    perspective[authorId] = flag
    next[perspectiveId] = perspective
    setFlags(next)
    chatStore.editChat(props.chat?._id!, { invisibleChars: next }, { quiet: true })
  }

  return (
    <div class="mt-1 flex flex-col gap-1">
      <div class="flex flex-col gap-0.5">
        <div class="font-bold">Defaults per Character</div>
        <div class="text-sm">By default, who can character's see messages from.</div>
      </div>{' '}
      <For each={props.participants.chars.concat(props.participants.tempsActive)}>
        {(perspective) => (
          <TitleCard
            title={
              <div class="flex items-center gap-1">
                <CharacterAvatar char={perspective} format={{ corners: 'circle', size: 'xs' }} />
                <span class="text-sm font-bold">{perspective.name}</span>
              </div>
            }
          >
            <div class="flex flex-wrap items-center gap-1">
              <For
                each={props.participants.chars
                  .concat(props.participants.tempsActive)
                  .filter((ch) => ch._id !== perspective._id)}
              >
                {(char) => (
                  <VisibilityToggle
                    char={char}
                    invisible={flags()[perspective._id]?.[char._id]}
                    onClick={() => toggle(perspective._id, char._id)}
                  />
                )}
              </For>
            </div>
          </TitleCard>
        )}
      </For>
    </div>
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
        'bg-900 hover:bg-[var(--bg-700)]': props.invisible === undefined || true,
        'bg-[var(--green-900)] hover:bg-[var(--green-700)]': props.invisible === false,
        'bg-[var(--error-900)] hover:bg-[var(--error-700)]': props.invisible === true,
      }}
    >
      <CharacterAvatar bot format={{ size: 'xs', corners: 'circle' }} char={props.char as any} />
      <strong class="ml-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap pr-1">
        {props.char.name}
      </strong>
      <Switch>
        <Match when={props.invisible === undefined}>
          <Minus size={16} />
        </Match>

        <Match when={props.invisible === false}>
          <Check size={16} color="var(--success-500)" />
        </Match>

        <Match when={props.invisible === true}>
          <X size={16} color="var(--error-500)" />
        </Match>
      </Switch>
    </div>
  )
}
