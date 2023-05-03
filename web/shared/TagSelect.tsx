import { Component, JSX, For, createSignal, Show, createMemo } from 'solid-js'
import { AppSchema } from '../../srv/db/schema'
import { DropMenu } from './DropMenu'
import AvatarIcon from './AvatarIcon'
import Button from './Button'
import { CheckSquare, ChevronDown, Square, Star, Users, X } from 'lucide-solid'
import { FormLabel } from './FormLabel'

export type TagOption = {
  tag: string
  count: number
}

const TagSelect: Component<{
  class?: string
  fieldName?: string
  label?: string
  helperText?: string | JSX.Element
  items: TagOption[]
  value: string[]
  onChange: (item: string[]) => void
}> = (props) => {
  const [opts, setOpts] = createSignal(false)

  const showAll = () => {
    props.onChange([])
  }

  const toggle = (value: string) => {
    props.onChange(
      props.value.includes(value) ? props.value.filter((v) => v !== value) : [...props.value, value]
    )
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
          <span class="ellipsis">
            <Show when={props.value.length}>{props.value!.join(', ')}</Show>
            <Show when={!props.value.length}>All tags</Show>
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
                  class="flex w-full cursor-pointer flex-row items-center justify-between gap-4 rounded-xl bg-[var(--bg-700)] py-1 px-2"
                  onClick={() => showAll()}
                >
                  <div class="ellipsis flex h-3/4 items-center">
                    <X />
                    <div class="font-bold">Show All Tags</div>
                  </div>
                </div>
                <For each={props.items}>
                  {(option) => (
                    <div
                      class="flex w-full cursor-pointer flex-row items-center justify-between gap-4 rounded-xl bg-[var(--bg-700)] py-1 px-2"
                      onClick={() => toggle(option.tag)}
                    >
                      <div class="ellipsis flex h-3/4 items-center gap-1">
                        <Show when={props.value.includes(option.tag)}>
                          <CheckSquare />
                        </Show>
                        <Show when={!props.value.includes(option.tag)}>
                          <Square />
                        </Show>
                        <span class="font-bold">{option.tag}</span>
                        <span>({option.count})</span>
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
