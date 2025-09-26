import { Component, JSX, For, createSignal, Show, createMemo, createEffect, on } from 'solid-js'
import { DropMenu } from './DropMenu'
import Button from './Button'
import { CheckSquare, ChevronDown, Square, X, XSquare } from 'lucide-solid'
import { FormLabel } from './FormLabel'
import { tagStore } from '../store'
import TextInput from './TextInput'

export type TagOption = {
  tag: string
  count: number
}

const TagSelect: Component<{
  class?: string
  fieldName?: string
  label?: string
  helperText?: string | JSX.Element
}> = (props) => {
  const state = tagStore((s) => ({ filter: s.filter, tags: s.tags, hidden: s.hidden }))
  const [filter, setFilter] = createSignal('')

  const [opts, setOpts] = createSignal(false)

  const setDefault = () => {
    tagStore.setDefault()
  }

  const toggle = (value: string) => {
    tagStore.toggle(value)
  }

  const filteredTags = createMemo(() => {
    const search = filter()
    if (!search.trim())
      return state.tags
        .slice()
        .sort((l, r) =>
          l.tag === 'archived'
            ? -1
            : r.tag === 'archived'
            ? 1
            : l.tag.toLocaleLowerCase().localeCompare(r.tag.toLocaleLowerCase())
        )

    const low = search.toLowerCase()
    const filtered = state.tags
      .filter((t) => t.tag.toLowerCase().includes(low))
      .sort((l, r) =>
        l.tag === 'archived'
          ? -1
          : r.tag === 'archived'
          ? 1
          : l.tag.toLocaleLowerCase().localeCompare(r.tag.toLocaleLowerCase())
      )
    return filtered
  })

  // Clear filter when opening
  createEffect(
    on(
      () => opts(),
      () => {
        const open = opts()
        if (!open) return
        setFilter('')
      }
    )
  )

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
          <span class="ellipsis">
            <Show when={state.filter.length}>{state.filter.join(', ')}</Show>
            <Show when={!state.filter.length}>All tags</Show>
          </span>
          <span class="absolute right-0">
            <ChevronDown />
          </span>
        </Button>
        <DropMenu show={opts()} close={() => setOpts(false)} customPosition="top-[8px] left-[0px]">
          <div class="flex max-h-[50vh] max-w-[50vw] flex-col sm:max-w-[30vw]">
            <div class="flex-1 overflow-y-auto">
              <div class="flex flex-col gap-2 p-2">
                <div
                  class="bg-700 flex w-full cursor-pointer flex-row items-center justify-between gap-4 rounded-xl px-2 py-1"
                  onClick={() => setDefault()}
                >
                  <div class="ellipsis flex h-3/4 items-center">
                    <X />
                    <div class="font-bold">Reset Tag Filters</div>
                  </div>
                </div>

                <div class="grid gap-1" style={{ 'grid-template-columns': '1fr auto' }}>
                  <TextInput
                    value={filter()}
                    onChange={(ev) => setFilter(ev.currentTarget.value)}
                    placeholder="Filter Tags..."
                  />
                  <div class="flex cursor-pointer items-center" onClick={() => setFilter('')}>
                    <X size={16} />
                  </div>
                </div>
                <Show when={filteredTags().length === 0}>
                  <div class="w-full px-2 py-1 font-bold">No Tags Found</div>
                </Show>
                <For each={filteredTags()}>
                  {(option) => (
                    <div
                      class="bg-700 flex w-full cursor-pointer flex-row items-center justify-between gap-4 rounded-xl px-2 py-1"
                      onClick={() => toggle(option.tag)}
                    >
                      <div class="ellipsis flex h-3/4 items-center gap-1">
                        <span classList={{ hidden: !state.filter.includes(option.tag) }}>
                          <CheckSquare />
                        </span>

                        <span classList={{ hidden: !state.hidden.includes(option.tag) }}>
                          <XSquare />
                        </span>
                        <span
                          classList={{
                            hidden:
                              state.hidden.includes(option.tag) ||
                              state.filter.includes(option.tag),
                          }}
                        >
                          <Square />
                        </span>
                        <span
                          classList={{ 'text-neutral-500': option.tag === 'archived' }}
                          class="select-none"
                        >
                          <span class="font-bold">{option.tag}</span>
                          <span>({option.count})</span>
                        </span>
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

export default TagSelect
