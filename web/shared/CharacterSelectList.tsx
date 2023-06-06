import { Component, For, Show, createMemo, createSignal } from 'solid-js'
import { AppSchema } from '../../srv/db/schema'
import AvatarIcon from './AvatarIcon'
import { Star, Users } from 'lucide-solid'
import TextInput from './TextInput'

export type Option<T extends string = string> = {
  label: string
  value: T
}

const CharacterSelectList: Component<{
  items: AppSchema.Character[]
  emptyLabel?: string
  onSelect: (item: AppSchema.Character | undefined) => void
}> = (props) => {
  const [_ref, setRef] = createSignal<any>()
  const [filter, setFilter] = createSignal('')

  const sorted = createMemo(() => {
    const words = filter()
      .trim()
      .toLowerCase()
      .split(' ')
      .filter((w) => !!w)

    return props.items
      .slice()
      .filter((i) => {
        if (!words.length) return true
        for (let word of words) {
          if (!wordMatch(i, word)) return false
        }
        return true
      })
      .sort((a, b) => +!!b.favorite - +!!a.favorite || a.name.localeCompare(b.name))
  })

  const onChange = (value: AppSchema.Character | undefined) => {
    props.onSelect(value)
  }

  const assignRef = (ref: any) => {
    setRef(ref)
    ref.focus()
  }

  return (
    <>
      <div class="flex-1 overflow-y-auto">
        <div class="flex flex-col gap-2 p-2">
          <TextInput
            fieldName="__filter"
            placeholder="Type to filter characters..."
            onKeyUp={(e) => setFilter(e.currentTarget.value)}
            ref={assignRef}
          />
          <Show when={props.emptyLabel}>
            <div
              class="bg-700 flex w-full cursor-pointer flex-row items-center justify-between gap-4 rounded-xl py-1 px-2"
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
                class="bg-700 flex w-full cursor-pointer flex-row items-center justify-between gap-4 rounded-xl py-1 px-2"
                onClick={() => onChange(item)}
              >
                <div class="ellipsis flex h-3/4 items-center">
                  <AvatarIcon
                    avatarUrl={item.avatar}
                    class="mr-4"
                    format={{ size: 'md', corners: 'circle' }}
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

function wordMatch(char: AppSchema.Character, word: string) {
  if (char.name.toLowerCase().includes(word)) return true
  if (char.description && char.description.toLowerCase().includes(word)) return true
  return false
}

export default CharacterSelectList
