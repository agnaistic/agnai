import { Component, JSX, For, createSignal, Show, Match, Switch } from 'solid-js'
import { DropMenu } from './DropMenu'
import Button from './Button'
import { CheckSquare, ChevronDown, Square, X, XSquare } from 'lucide-solid'
import { FormLabel } from './FormLabel'
import { tagStore } from '../store'

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
  const state = tagStore()

  const [opts, setOpts] = createSignal(false)

  const setDefault = () => {
    tagStore.setDefault()
  }

  const toggle = (value: string) => {
    tagStore.toggle(value)
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
                <For each={state.tags}>
                  {(option) => (
                    <div
                      class="bg-700 flex w-full cursor-pointer flex-row items-center justify-between gap-4 rounded-xl px-2 py-1"
                      onClick={() => toggle(option.tag)}
                    >
                      <div class="ellipsis flex h-3/4 items-center gap-1">
                        <Switch>
                          <Match when={state.filter.includes(option.tag)}>
                            <CheckSquare />
                          </Match>
                          <Match when={state.hidden.includes(option.tag)}>
                            <XSquare />
                          </Match>
                          <Match when={true}>
                            <Square />
                          </Match>
                        </Switch>
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
