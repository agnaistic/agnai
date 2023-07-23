import { Radio } from 'lucide-solid'
import { createMemo, Show } from 'solid-js'
import { Component } from 'solid-js'
import { AppSchema } from '../../common/types/schema'
import { CharacterAvatar } from './AvatarIcon'

export const CharacterPill: Component<{
  char: AppSchema.BaseCharacter
  disabled: boolean
  active?: boolean
  onClick: (charId: string) => void
}> = (props) => {
  const cursor = createMemo(() => (props.disabled ? 'cursor-default' : 'cursor-pointer'))

  return (
    <Show when={props.char}>
      <div
        class={`flex min-w-[100px] max-w-[200px] overflow-hidden px-2 py-1 ${cursor()} bg-900 items-center rounded-md border-[1px] border-[var(--bg-800)] hover:bg-[var(--bg-800)]`}
        onclick={() => !props.disabled && props.onClick(props.char._id)}
      >
        <CharacterAvatar
          bot={true}
          format={{ size: 'xs', corners: 'circle' }}
          char={props.char as any}
        />
        <strong class="ml-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap pr-1">
          {props.char.name}
        </strong>
        <Show when={props.active}>
          <Radio size={16} />
        </Show>
      </div>
    </Show>
  )
}
