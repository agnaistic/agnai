import { Component, For, JSX } from 'solid-js'

const Tabs: Component<{
  tabs: string[] | readonly string[]
  selected: () => number
  select: (idx: number) => void
  class?: string
}> = (props) => {
  return (
    <div
      class={
        'flex h-10 max-h-max w-full flex-1 select-none flex-row overflow-x-auto ' + props.class ||
        ''
      }
    >
      <For each={props.tabs}>
        {(tab, i) => (
          <div
            onClick={() => props.select(i())}
            class={`flex cursor-pointer items-center justify-center border-b-2 py-2 ${border(
              props.selected() === i()
            )} text-md rounded-t-md px-4`}
          >
            {tab}
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
    : `hover:bg-[var(--bg-800)] border-[var(--bg-800)] hover:border-[var(--bg-700)]`
