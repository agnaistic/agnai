import { Component, For, JSX, Show, createMemo, onMount } from 'solid-js'
import Sort from 'sortablejs'
import { FormLabel } from './FormLabel'
import { Menu, Power } from 'lucide-solid'

export { Sortable as default }

export type SortItem = {
  id: number
  value: string | number
  label: string | JSX.Element
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

  const onClick = (id: number) => {
    const prev = props.items.slice()
    const match = prev.find((p) => p.id === id)

    if (match?.enabled === undefined) return

    console.log(match?.value, match?.enabled, '-->', !match?.enabled)
    const next = prev.map((o) => {
      if (o.id !== id) return { ...o }
      return { ...o, enabled: !o.enabled }
    })

    props.onChange(next)
  }

  const items = createMemo(() => {
    return props.items.reduce((prev, curr) => {
      prev[curr.id] = curr
      return prev
    }, {} as Record<number, SortItem>)
  })

  onMount(() => {
    const s = Sort.create(ref, {
      animation: 150,
      ghostClass: `bg-500`,
      onUpdate: (evt) => {
        if (evt.oldIndex === evt.newIndex) return
        if (evt.oldIndex === undefined || evt.newIndex === undefined) return

        const moving = props.items[evt.oldIndex!]

        const next = props.items.filter((i) => i.id !== moving.id)
        next.splice(evt.newIndex!, 0, moving)

        props.onChange(next)
      },
    })
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

        <div class="flex gap-1">
          <ul class="w-full" ref={ref!}>
            <For each={props.items}>
              {(item) => {
                const match = items()[item.id]
                if (!match) return null

                return (
                  <li
                    class={`flex w-full gap-2 border-[1px] border-[var(--bg-700)] ${
                      props.itemClass || ''
                    }`}
                    data-id={match.id}
                    classList={{
                      'cursor-pointer': match.enabled !== undefined,
                      'bg-800': match.enabled !== undefined ? true : match.enabled,
                      'bg-900': match.enabled === false,
                      'text-[var(--coolgray-800)]': match.enabled === false,
                    }}
                  >
                    <div class="flex w-full gap-1">
                      <a class="flex h-10 w-full items-center gap-2 pl-2">
                        <Menu size={16} color="var(--bg-500)" /> {match.label}
                      </a>
                      <Show when={match.enabled !== undefined}>
                        <div
                          class="icon-button flex h-10 w-10 items-center justify-center"
                          onClick={() => {
                            onClick(+match.id)
                            match.onClick?.({
                              id: +match.id,
                              value: match.value,
                              enabled: match.enabled,
                            })
                          }}
                        >
                          <Power size={16} />
                        </div>
                      </Show>
                    </div>
                  </li>
                )
              }}
            </For>
          </ul>
          <div class="flex flex-col"></div>
        </div>
      </div>
    </>
  )
}
