import { Component, Index, Show, createEffect, createMemo, createSignal } from 'solid-js'
import Button from './Button'
import { clamp } from '/common/util'
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from 'lucide-solid'
import { useDeviceType } from './hooks'
import { storage } from './util'
import TextInput from './TextInput'

export const ManualPaginate: Component<{
  pager: Pager
  sticky?: boolean
  size?: 'sm' | 'md' | 'lg'
}> = (props) => {
  const onPageSize = (ev: FormEvent) => {
    const value = +ev.currentTarget.value
    if (isNaN(value)) return
    if (value < 0) return

    props.pager.setPageSize(value)
  }

  const btnSize = createMemo(() => 'sm' as const)

  const disabled = createMemo(() => props.pager.pages() === 1)

  return (
    <div
      class="flex w-fit justify-center gap-1"
      classList={{
        fixed: props.sticky,
        'bottom-0': props.sticky,
        'mb-4': props.sticky,
        'bg-700': props.sticky,
        'rounded-md': props.sticky,
        'p-1': props.sticky,
      }}
    >
      <Show when={props.pager.pages() > props.pager.pagerSize()}>
        <Button
          size={btnSize()}
          schema="secondary"
          class="px-2"
          onClick={() => props.pager.setPage(1)}
          disabled={disabled()}
        >
          <ChevronFirst size={20} />
        </Button>
      </Show>
      <Button
        size={btnSize()}
        schema="secondary"
        class="px-2"
        onClick={props.pager.prev}
        disabled={disabled()}
      >
        <ChevronLeft size={20} />
      </Button>
      <Index each={props.pager.ids()}>
        {(id) => (
          <Button
            size={btnSize()}
            disabled={disabled()}
            schema="none"
            classList={{
              'btn-primary': id() === props.pager.page(),
              'btn-secondary': id() !== props.pager.page(),
            }}
            class={`w-10 px-1`}
            onClick={() => props.pager.setPage(id())}
          >
            {id()}
          </Button>
        )}
      </Index>
      <Button
        size={btnSize()}
        schema="secondary"
        class="px-2"
        onClick={props.pager.next}
        disabled={disabled()}
      >
        <ChevronRight size={20} />
      </Button>
      <Show when={props.pager.pages() > 5}>
        <Button
          size={btnSize()}
          disabled={disabled()}
          schema="secondary"
          class="px-2"
          onClick={() => props.pager.setPage(props.pager.pages())}
        >
          <ChevronLast size={20} />
        </Button>
      </Show>
      <TextInput
        type="number"
        fieldName="paginationSize"
        value={props.pager.pageSize()}
        onChange={onPageSize}
        class="w-20 py-[2px]"
      />
    </div>
  )
}

export const AutoPaginate: Component<{
  name?: string
  pageSize: number
  items: any[]
  setItems: (items: any[]) => void
  sticky?: boolean
}> = (props) => {
  const items = createMemo(() => props.items)
  const pager = usePagination({ name: props.name, items, pageSize: props.pageSize })

  return <ManualPaginate pager={pager} />
}

type Pager<T = any> = {
  ids: () => number[]
  next: () => void
  prev: () => void
  page: () => number
  pages: () => number
  setPage: (page: number) => void
  pageSize: () => number
  setPageSize: (size: number) => void
  items: () => T[]
  setItems: (items: T[]) => void
  pagerSize: () => number
}

export function usePagination<T = any>(opts: {
  name?: string
  pageSize: number
  items: () => T[]
}): Pager<T> {
  const localName = `agnai-paging-${opts.name}`
  const isMobile = useDeviceType()

  const savedSize = +(storage.localGetItem(localName) ?? `${opts.pageSize}`)
  const [page, setPage] = createSignal(1)
  const [pageSize, setPageSize] = createSignal(savedSize)
  const safeSize = createMemo(() => (pageSize() <= 0 ? 20 : pageSize()))

  const [items, setItems] = createSignal<T[]>(opts.items().slice(0, safeSize()))
  const [count, setCount] = createSignal(opts.items().length)

  const pagerSize = createMemo(() => (isMobile() ? 3 : 5))

  const pages = createMemo(() => Math.ceil(opts.items().length / safeSize()))

  const ids = createMemo(() => {
    return getButtonIds(page(), pages(), isMobile() ? 1 : 2)
  })

  const next = () => {
    const curr = page()
    const next = clamp(curr + 1, pages(), 1)
    setPage(next)
  }

  const prev = () => {
    const curr = page()
    const next = clamp(curr - 1, pages(), 1)
    setPage(next)
  }

  createEffect(() => {
    const items = opts.items().slice()
    const original = count()
    const itemsChanged = original !== items.length
    const curr = itemsChanged ? 1 : page()
    const start = (curr - 1) * safeSize()
    const nextItems = items.slice(start, start + safeSize())
    setItems(nextItems)
    setCount(items.length)

    if (itemsChanged) {
      setPage(1)
    }
  })

  createEffect(() => {
    const size = safeSize()
    if (!opts.name) return
    storage.localSetItem(localName, `${size}`)
  })

  return {
    ids,
    next,
    prev,
    page,
    pages,
    setPage,
    pageSize,
    setPageSize,
    items,
    setItems,
    pagerSize,
  }
}

function getButtonIds(page: number, max: number, span: number) {
  let start = clamp(page - span, max, 1)
  let end = clamp(page + span, max, 1)
  const size = end - start + 1
  let remainder = span * 2 + 1 - size

  const init = { start, end }

  if (remainder > 0) {
    if (start <= 3) {
      end = clamp(end + remainder, max, 1)
      remainder = Math.abs(remainder - (end - init.end))
      if (remainder > 0) start = clamp(start - remainder, max, 1)
    } else if (end >= max - 3) {
      start = clamp(start - remainder, max, 1)
      remainder = Math.abs(remainder - (init.start - start))
      if (remainder > 0) end = clamp(end + remainder, max, 1)
    }
  }

  return Array.from({ length: end - start + 1 }, (_, i) => i + start)
}
