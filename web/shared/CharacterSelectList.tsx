import { Component, For, Show, createMemo } from 'solid-js'
import { AppSchema } from '../../srv/db/schema'
import AvatarIcon from './AvatarIcon'
import { Star, Users } from 'lucide-solid'

export type Option<T extends string = string> = {
  label: string
  value: T
}

const CharacterSelectList: Component<{
  items: AppSchema.Character[]
  emptyLabel?: string
  onSelect: (item: AppSchema.Character | undefined) => void
}> = (props) => {
  const sorted = createMemo(() => {
    const items = props.items.slice()
    items.sort((a, b) => +!!b.favorite - +!!a.favorite || a.name.localeCompare(b.name))
    return items
  })

  const onChange = (value: AppSchema.Character | undefined) => {
    props.onSelect(value)
  }

  return (
    <>
      <div class="flex-1 overflow-y-auto">
        <div class="flex flex-col gap-2 p-2">
          <Show when={props.emptyLabel}>
            <div
              class="flex w-full cursor-pointer flex-row items-center justify-between gap-4 rounded-xl bg-[var(--bg-700)] py-1 px-2"
              onClick={() => onChange(undefined)}
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
                  <AvatarIcon
                    avatarUrl={item.avatar}
                    class="mr-4"
                    format={{ size: 'xs', corners: 'circle' }}
                  />
                  <div class="ellipsis flex w-full flex-col">
                    <div class="ellipsis font-bold">{item.name}</div>
                    <div class="ellipsis">{item.description}</div>
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
    </>
  )
}

export default CharacterSelectList
