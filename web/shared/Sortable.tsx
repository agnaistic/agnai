import { Component, For, JSX, createSignal, onMount } from 'solid-js'
import Sort from 'sortablejs'
import { FormLabel } from './FormLabel'
import { Menu } from 'lucide-solid'

export { Sortable as default }

export type SortItem = { id: number | string; label: string; enabled?: boolean }

const Sortable: Component<{
  items: SortItem[]
  label?: JSX.Element | string
  helperText?: JSX.Element
  onChange: (order: number[]) => void
  setSorter?: (sort: Sort) => void
  onItemClick?: (id: number) => void
  enabled?: number[]
}> = (props) => {
  let ref: HTMLUListElement

  const [_sort, setSort] = createSignal<Sort>()

  onMount(() => {
    const s = Sort.create(ref, {
      animation: 150,
      ghostClass: `bg-500`,
      onUpdate: () => {
        const order: number[] = []
        for (const child of Array.from(ref.children)) {
          const attr = child.getAttribute('data-id')
          order.push(+attr!)
        }
        props.onChange(order)
      },
    })
    props.setSorter?.(s)
    setSort(s)
  })

  return (
    <>
      <div>
        <FormLabel label={props.label} helperText={props.helperText} />
        <ul ref={ref!}>
          <For each={props.items}>
            {(item) => (
              <li
                class="flex h-10 cursor-pointer items-center gap-2 border-[1px] border-[var(--bg-700)] pl-2"
                data-id={item.id}
                onClick={() => props.onItemClick?.(+item.id)}
                classList={{
                  'bg-800': !props.enabled || props.enabled?.includes(+item.id),
                  'bg-900': props.enabled?.includes(+item.id) === false,
                  'text-[var(--coolgray-800)]': props.enabled?.includes(+item.id) === false,
                }}
              >
                <Menu size={16} color="var(--bg-500)" /> {item.label}
              </li>
            )}
          </For>
        </ul>
      </div>
    </>
  )
}
