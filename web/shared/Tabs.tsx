import { Component, For, JSX, createMemo, createSignal } from 'solid-js'

export type TabHook = {
  tabs: string[]
  select: (tab: number) => void
  selected: () => number
  current: () => string
}

const Tabs: Component<{
  tabs: string[]
  selected: () => number
  select: (idx: number) => void
  titles?: Array<JSX.Element | string>
  class?: string
}> = (props) => {
  return (
    <div
      class={
        'flex h-10 max-h-max w-full flex-1 select-none flex-row overflow-x-auto text-sm ' +
          props.class || ''
      }
    >
      <For each={props.tabs}>
        {(tab, i) => (
          <div
            onClick={() => props.select(i())}
            class={`flex min-w-max cursor-pointer items-center justify-center rounded-t-md border-b-2 px-4 py-2`}
            classList={{
              'bg-[var(--hl-800)] border-[var(--hl-500)] hover:border-[var(--hl-400)]':
                props.selected() === i(),
              'bg-900 hover:bg-[var(--bg-800)] border-[var(--bg-700)] hover:border-[var(--bg-500)]':
                props.selected() !== i(),
              'border-l-[1px]': props.selected() !== i(),
              'border-t-[1px]': props.selected() !== i(),
              'border-r-[1px]': props.selected() !== i(),
            }}
          >
            {props.titles ? props.titles[i()] : tab}
          </div>
        )}
      </For>
    </div>
  )
}

export default Tabs

export function useTabs(tabs: string[], initial: number = 0): TabHook {
  const [tab, setTabs] = createSignal(initial)
  const current = createMemo(() => {
    return tabs[tab()]
  })

  return {
    tabs,
    selected: tab,
    select: setTabs,
    current,
  }
}
