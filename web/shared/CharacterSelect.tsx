import { Component, JSX, createSignal, Show, createMemo } from 'solid-js'
import { AppSchema } from '../../common/types/schema'
import { DropMenu } from './DropMenu'
import { CharacterAvatar } from './AvatarIcon'
import Button from './Button'
import { ChevronDown, Users } from 'lucide-solid'
import { FormLabel } from './FormLabel'
import CharacterSelectList from './CharacterSelectList'

export type Option<T extends string = string> = {
  label: string
  value: T
}

const CharacterSelect: Component<{
  fieldName: string
  label?: string
  helperText?: string | JSX.Element
  items: AppSchema.Character[]
  emptyLabel?: string
  value?: AppSchema.Character | string
  disabled?: boolean
  class?: string
  onChange?: (item: AppSchema.Character | undefined) => void
}> = (props) => {
  const [opts, setOpts] = createSignal(false)

  const match = createMemo(() =>
    typeof props.value === 'string' ? props.items.find((ch) => ch._id === props.value) : props.value
  )

  const onChange = (value?: AppSchema.Character) => {
    if (!props.onChange) return
    props.onChange(value)
    setOpts(false)
  }

  return (
    <>
      <FormLabel label={props.label} helperText={props.helperText} />
      <div class="">
        <Button
          schema="secondary"
          class={`relative rounded-xl ${props.class}`}
          onClick={() => setOpts(!opts())}
          alignLeft
        >
          <Show when={props.value}>
            <CharacterAvatar
              char={match()!}
              format={{ size: 'xs', corners: 'circle' }}
              surround
              zoom={1.75}
            />
          </Show>
          <Show when={!props.value}>
            <div class="mr-1 flex h-6 w-6 shrink-0 items-center justify-center">
              <Users />
            </div>
          </Show>

          <span class="ellipsis">{match()?.name || props.emptyLabel || 'Select ...'}</span>
          <span class="absolute right-0">
            <ChevronDown />
          </span>
        </Button>
        <DropMenu show={opts()} close={() => setOpts(false)} customPosition="top-[8px] left-[0px]">
          <div class="flex max-h-[400px] max-w-[50vw] flex-col sm:max-w-[280px]">
            <CharacterSelectList
              items={props.items}
              onSelect={onChange}
              emptyLabel={props.emptyLabel}
            />
          </div>
        </DropMenu>
      </div>
    </>
  )
}

export default CharacterSelect
