import { Component, For, JSX } from 'solid-js'

const Tabs: Component<{
  tabs: string[]
  selected: () => number
  select: (idx: number) => void
  class?: string
}> = (props) => {
  return (
    <div class={'flex h-10 w-full flex-1 flex-row ' + props.class || ''}>
      <For each={props.tabs}>
        {(tab, i) => (
          <div
            onClick={() => props.select(i())}
            class={`flex w-full cursor-pointer items-center justify-center border-b-2 text-sm sm:text-4xl ${border(
              props.selected() === i()
            )} px-4 text-xl hover:border-slate-700 `}
          >
            {tab}
          </div>
        )}
      </For>
    </div>
  )
}

export default Tabs

const border = (selected: boolean) => (selected ? `border-purple-500` : `border-slate-800`)
