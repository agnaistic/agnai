import { Component, For, createMemo } from 'solid-js'
import Button from './Button'
import { clamp } from '/common/util'

export const Paginate: Component<{
  pages: number
  current: number
  update: (page: number) => void
}> = (props) => {
  const ids = createMemo(() => {
    return Array.from({ length: props.pages }, (_, i) => i)
  })
  return (
    <div class="flex gap-2">
      <Button onClick={() => props.update(clamp(props.current - 1, props.pages - 1, 0))}>
        Prev
      </Button>
      <For each={ids()}>{(id) => <Button onClick={() => props.update(id)}>{id + 1}</Button>}</For>
      <Button onClick={() => props.update(clamp(props.current + 1, props.pages - 1, 0))}>
        Next
      </Button>
    </div>
  )
}
