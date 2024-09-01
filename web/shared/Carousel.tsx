import { Component, createMemo, createSignal, JSX } from 'solid-js'

type Props = {
  items: Array<string | JSX.Element>
  parentClass?: string
  class?: string

  /** Time per slide - Stops auto-sliding after manual navigating */
  ttlSecs?: number
}

export const Carousel: Component<Props> = (props) => {
  const [pos, setPos] = createSignal(0)
  const [timer, setTimer] = createSignal<any>()

  const navigate = (dir: -1 | 1, manual?: boolean) => {
    if (manual) {
      const interval = timer()
      if (interval) {
        clearInterval(interval)
        setTimer(null)
      }
    }

    let curr = pos() + dir

    if (curr < 0) curr = props.items.length - 1
    else if (curr >= props.items.length) curr = 0

    setPos(curr)
  }

  const content = createMemo(() => {
    const index = pos()
    return props.items[index]
  })

  return (
    <div class={`relative flex w-full justify-center ${props.parentClass || ''}`}>
      <div class="" onClick={() => navigate(1)}>
        {content()}
      </div>
    </div>
  )
}
