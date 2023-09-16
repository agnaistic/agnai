import { Component, For, JSX, createMemo, createSignal } from 'solid-js'

const Tabs: Component<{
  tabs: string[] | readonly string[]
  selected: () => number
  select: (idx: number) => void
  titles?: Array<JSX.Element | string>
  class?: string
}> = (props) => {
  return (
    <div
      class={
        'flex h-10 max-h-max w-full flex-1 select-none flex-row overflow-x-auto text-sm' +
          props.class || ''
      }
    >
      <For each={props.tabs}>
        {(tab, i) => (
          <div
            onClick={() => props.select(i())}
            class={`flex min-w-max cursor-pointer items-center justify-center border-b-2 py-2 ${border(
              props.selected() === i()
            )} rounded-t-md px-4`}
          >
            {props.titles ? props.titles[i()] : tab}
          </div>
        )}
      </For>
    </div>
  )
}

export default Tabs

const border = (selected: boolean) =>
  selected
    ? `bg-[var(--hl-800)] border-[var(--hl-500)] hover:border-[var(--hl-400)]`
    : `bg-900 hover:bg-[var(--bg-800)] border-[var(--bg-800)] hover:border-[var(--bg-700)]`

export function useTabs(tabs: string[], initial: number = 0) {
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
