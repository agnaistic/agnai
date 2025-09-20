import { Component, JSX, createSignal, Show, createMemo } from 'solid-js'
import { AppSchema } from '../../common/types/schema'
import { DropMenu, Horz, Vert } from './DropMenu'
import { CharacterAvatar } from './AvatarIcon'
import Button from './Button'
import { ChevronDown, Dices, Users } from 'lucide-solid'
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
  random?: boolean

  horz?: Horz
  vert?: Vert

  /** Ignore the active chat - Do not promote current characters to the top of the list */
  ignoreActive?: boolean
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

  const selectRandom = () => {
    const index = Math.floor(Math.random() * props.items.length)
    const item = props.items[index]

    if (item) {
      onChange(item)
    }
  }

  return (
    <>
      <FormLabel label={props.label} helperText={props.helperText} />
      <div class="relative flex items-center gap-1">
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
        <Show when={props.random && props.items.length > 1}>
          <Button size="md" schema="bordered" onClick={selectRandom}>
            <Dices size={16} />
          </Button>
        </Show>

        <DropMenu
          show={opts()}
          close={() => setOpts(false)}
          horz={props.horz || 'left'}
          vert={props.vert || 'down'}
        >
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
