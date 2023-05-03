import { Component, JSX, For, createSignal, Show, createMemo } from 'solid-js'
import { AppSchema } from '../../srv/db/schema'
import { DropMenu } from './DropMenu'
import AvatarIcon from './AvatarIcon'
import Button from './Button'
import { ChevronDown, Star, Users } from 'lucide-solid'
import { FormLabel } from './FormLabel'

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
  value?: AppSchema.Character
  disabled?: boolean
  onChange?: (item: AppSchema.Character | undefined) => void
}> = (props) => {
  const [opts, setOpts] = createSignal(false)
  const sorted = createMemo(() => {
    const items = props.items.slice()
    items.sort((a, b) => +!!b.favorite - +!!a.favorite || a.name.localeCompare(b.name))
    return items
  })

  const onChange = (value?: AppSchema.Character) => {
    if (!props.onChange) return
    props.onChange(value)
    setOpts(false)
  }

  return (
    <>
      <FormLabel label={props.label} helperText={props.helperText} />
      <div class="py-1">
        <Button
          schema="secondary"
          class="relative w-48 rounded-xl"
          onClick={() => setOpts(!opts())}
          alignLeft
        >
          <Show when={props.value}>
            <AvatarIcon
              avatarUrl={props.value?.avatar}
              format={{ size: 'xs', corners: 'circle' }}
              class={`mr-1`}
            />
          </Show>
          <Show when={!props.value}>
            <div class="mr-1 flex h-6 w-6 shrink-0 items-center justify-center">
              <Users />
            </div>
          </Show>

          <span class="ellipsis">
            {props.value?.name || props.emptyLabel || 'Select a character'}
          </span>
          <span class="absolute right-0">
            <ChevronDown />
          </span>
        </Button>
        <DropMenu show={opts()} close={() => setOpts(false)} customPosition="top-[8px] left-[0px]">
          <div class="flex max-h-[400px] max-w-[50vw] flex-col sm:max-w-[30vw]">
            <div class="flex-1 overflow-y-auto">
              <div class="flex flex-col gap-2 p-2">
                <Show when={props.emptyLabel}>
                  <div
                    class="flex w-full cursor-pointer flex-row items-center justify-between gap-4 rounded-xl bg-[var(--bg-700)] py-1 px-2"
                    onClick={() => onChange()}
                  >
                    <div class="ellipsis flex h-3/4 items-center">
                      <div class="mr-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--black-700)] sm:h-10 sm:w-10">
                        <Users />
                      </div>
                      <div class="ellipsis flex w-full flex-col">
                        <div class="font-bold">{props.emptyLabel}</div>
                      </div>
                    </div>
                  </div>
                </Show>
                <For each={sorted()}>
                  {(item) => (
                    <div
                      class="flex w-full cursor-pointer flex-row items-center justify-between gap-4 rounded-xl bg-[var(--bg-700)] py-1 px-2"
                      onClick={() => onChange(item)}
                    >
                      <div class="ellipsis flex h-3/4 items-center">
                        <AvatarIcon avatarUrl={item.avatar} class="mr-4" />
                        <div class="ellipsis flex w-full flex-col">
                          <div class="font-bold">{item.name}</div>
                          <div class="">{item.description}</div>
                        </div>
                      </div>
                      <div>
                        <div class="hidden flex-row items-center justify-center gap-2 sm:flex">
                          <Show when={item.favorite}>
                            <Star class="icon-button fill-[var(--text-900)] text-[var(--text-900)]" />
                          </Show>
                        </div>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </div>
        </DropMenu>
      </div>
    </>
  )
}

export default CharacterSelect
