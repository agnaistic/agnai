import { Component, For, JSX, Match, Switch, createMemo, createSignal } from 'solid-js'
import Select from './Select'

export type TabHook<T extends string[] = string[]> = {
  tabs: () => T
  update: (tabs: T) => void
  set: (tab: T[number]) => void
  select: (tab: number) => void
  selected: () => number
  current: () => T[number]
}

const Tabs: Component<{
  tabs: string[]
  selected: () => number
  display?: 'tabs' | 'select'
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
      <Switch>
        <Match when={props.display === 'select'}>
          <Select
            items={props.tabs.map((t, i) => ({ label: t, value: `${i}` }))}
            onChange={(ev) => props.select(+ev.value)}
          />
        </Match>
        <Match when>
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
        </Match>
      </Switch>
    </div>
  )
}

export default Tabs

export function useTabs<T extends string[] = string[]>(
  initalTabs: T,
  initial: number = 0
): TabHook<T> {
  const [tabs, updateTabs] = createSignal(initalTabs)
  const [tab, setTabs] = createSignal(initial)
  const current = createMemo(() => {
    const list = tabs()
    return list[tab()]
  })

  const setTab = (tab: T[number]) => {
    const list = tabs()
    const index = list.findIndex((t) => t === tab)
    setTabs(index)
  }

  return {
    tabs,
    update: (next: T) => updateTabs(next as any),
    selected: tab,
    select: setTabs,
    set: setTab,
    current: current as () => T[number],
  }
}

export function useStrictTabs<T extends string[]>(tabs: T, initial = 0): TabHook<T> {
  return useTabs<T>(tabs, initial)
}
