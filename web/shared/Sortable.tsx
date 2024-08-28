import { Component, For, Index, JSX, Show, createMemo, createSignal, onMount } from 'solid-js'
import Sort from 'sortablejs'
import { FormLabel } from './FormLabel'
import { Menu, Power } from 'lucide-solid'
import TextInput from './TextInput'

export { Sortable as default }

export type SortItem = {
  id: number
  value: string | number
  label: string
  enabled?: boolean
  onClick?: (item: { id: number; value: string | number; enabled?: boolean }) => void
}

const Sortable: Component<{
  field?: string
  items: SortItem[]
  label?: JSX.Element | string
  helperText?: JSX.Element
  onChange: (items: SortItem[]) => void
  onItemClick?: (id: number) => void
  setSorter?: (sort: Sort) => void
  disabled?: boolean
  itemClass?: string
  parentClass?: string
}> = (props) => {
  let ref: HTMLUListElement
  let field: HTMLInputElement

  const [_sort, setSort] = createSignal<Sort>()
  const [items, setItems] = createSignal(props.items)

  const enabled = createMemo(() => {
    const state: { [id: number]: boolean } = {}

    for (const item of items()) {
      if (item.enabled === undefined) continue
      state[item.id] = item.enabled
    }

    return state
  })

  const updateOrder = (ev: number[]) => {
    const order = ev.reduce((prev, curr, i) => {
      prev.set(curr, i)
      return prev
    }, new Map<number, number>())

    const next = items()
      .slice()
      .sort((left, right) => order.get(left.id)! - order.get(right.id)!)

    setItems(next)
    props.onChange(next)
    if (field) {
      const value = next.map((n) => `${n.value}=${n.enabled ? 'on' : 'off'}`).join(',')
      field.value = value
    }
  }

  const onClick = (id: number) => {
    const prev = items()
    const match = prev.find((p) => p.id === id)

    if (match?.enabled === undefined) return

    console.log(match?.value, match?.enabled, '-->', !match?.enabled)
    const next = prev.map((o) => {
      if (o.id !== id) return o
      return { ...o, enabled: !o.enabled }
    })
    setItems(next)
    props.onChange(next)
  }

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
        updateOrder(order)
      },
    })
    setSort(s)
    props.setSorter?.(s)
  })

  return (
    <>
      <div
        class={`${props.disabled ? 'pointer-events-none opacity-50' : ''} ${
          props.parentClass || ''
        }`}
      >
        <FormLabel label={props.label} helperText={props.helperText} />
        <Show when={!!props.field}>
          <TextInput fieldName={props.field!} parentClass="hidden" ref={(ele) => (field = ele)} />
        </Show>

        <div class="flex gap-1">
          <ul class="w-full" ref={ref!}>
            <Index each={items()}>
              {(item) => {
                const match = items().find((i) => i.id === item().id)
                if (!match) return null
                return (
                  <li
                    class={` border-[1px] border-[var(--bg-700)] ${props.itemClass || ''}`}
                    data-id={match.id}
                    classList={{
                      'cursor-pointer': item().enabled !== undefined,
                      'bg-800': enabled()[match.id] !== undefined ? true : !enabled()[match.id],
                      'bg-900': enabled()[match.id] === false,
                      'text-[var(--coolgray-800)]': enabled()[match.id] === false,
                    }}
                  >
                    <a class="flex h-10 w-full items-center gap-2 pl-2">
                      <Menu size={16} color="var(--bg-500)" /> {match.label}
                    </a>
                  </li>
                )
              }}
            </Index>
          </ul>
          <div class="flex flex-col">
            <For each={items()}>
              {(item) => {
                const match = items().find((i) => i.id === item.id)
                if (!match || match.enabled === undefined) return null

                return (
                  <div
                    class="icon-button flex h-10 w-10 items-center justify-center"
                    onClick={() => {
                      onClick(+match.id)
                      item.onClick?.({
                        id: +match.id,
                        value: item.value,
                        enabled: item.enabled,
                      })
                    }}
                  >
                    <Power size={16} />
                  </div>
                )
              }}
            </For>
          </div>
        </div>
      </div>
    </>
  )
}
