import { Component, For, Show, createMemo, createSignal } from 'solid-js'
import { AppSchema } from '../../common/types/schema'
import { CharacterAvatar } from './AvatarIcon'
import { Star, Users } from 'lucide-solid'
import TextInput from './TextInput'
import { chatStore } from '../store'
import { toMap } from './util'
import { Pill } from './Card'
import Divider from './Divider'

export type Option<T extends string = string> = {
  label: string
  value: T
}

const MAX_DISPLAY = 50

const CharacterSelectList: Component<{
  items: AppSchema.Character[]
  emptyLabel?: string
  ignoreActive?: boolean
  onSelect: (item: AppSchema.Character | undefined) => void
}> = (props) => {
  const chats = chatStore()
  const [_ref, setRef] = createSignal<any>()
  const [search, setSearch] = createSignal('')

  const current = createMemo(() => {
    if (!chats.active?.chat || props.ignoreActive) return

    const chars: AppSchema.Character[] = []
    const map = chats.active.chat.characters || {}
    for (const char of props.items) {
      if (char._id in map) {
        chars.push(char)
      }
    }

    for (const char of Object.values(chats.active.chat.tempCharacters || {})) {
      // Ignore 'hidden' temporary characters
      if (char.deletedAt) continue
      if (char.favorite === false) continue
      chars.push(char)
    }

    return { list: chars, map: toMap(chars) }
  })

  const sorted = createMemo(() => {
    return narrow(props.items, search(), current()?.map)
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
            onKeyUp={(e) => setSearch(e.currentTarget.value)}
            ref={assignRef}
          />
          <Show when={props.items.length > MAX_DISPLAY}>
            <div class="flex w-full justify-center">
              <Pill type="orange" small>
                Too many characters to display - Use the search field
              </Pill>
            </div>
          </Show>
          <Show when={props.emptyLabel}>
            <div
              class="bg-700 flex w-full cursor-pointer flex-row items-center justify-between gap-4 rounded-xl px-2 py-1"
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
          <Show when={current()?.list?.length}>
            <For each={current()?.list}>
              {(item) => (
                <div
                  class="bg-700 flex w-full cursor-pointer flex-row items-center justify-between gap-4 rounded-xl px-2 py-1"
                  onClick={() => onChange(item)}
                >
                  <div class="ellipsis flex h-3/4 items-center gap-4">
                    <CharacterAvatar char={item} format={{ size: 'sm', corners: 'circle' }} />

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
            <Divider />
          </Show>
          <For each={sorted()}>
            {(item) => (
              <div
                class="bg-700 flex w-full cursor-pointer flex-row items-center justify-between gap-4 rounded-xl px-2 py-1"
                onClick={() => onChange(item)}
              >
                <div class="ellipsis flex h-3/4 items-center gap-4">
                  <CharacterAvatar char={item} format={{ size: 'sm', corners: 'circle' }} />

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

function narrow(
  chars: AppSchema.Character[],
  search: string,
  exclude?: Record<string, AppSchema.Character>
) {
  const words = search
    .trim()
    .toLowerCase()
    .split(' ')
    .filter((w) => !!w)

  return chars
    .slice()
    .filter((i) => {
      if (exclude && i._id in exclude) return false
      if (!words.length) return true
      for (let word of words) {
        return wordMatch(i, word)
      }
    })
    .sort(faveSort)
    .slice(0, MAX_DISPLAY)
}

function faveSort(a: AppSchema.Character, b: AppSchema.Character) {
  return +!!b.favorite - +!!a.favorite || a.name.localeCompare(b.name)
}
