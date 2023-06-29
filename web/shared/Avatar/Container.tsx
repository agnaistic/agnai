import { Component, Show, createMemo, createSignal, onCleanup, onMount } from 'solid-js'
import { EmoteType, FullSprite } from '/common/types/sprite'
import AvatarCanvas from './Canvas'
import { getEmoteExpressions } from '/web/asset/sprite'
import { calcBounds } from './hooks'

const AvatarContainer: Component<{
  container: HTMLElement
  expression?: EmoteType
  body?: FullSprite
  zoom?: number
}> = (props) => {
  let bound: HTMLDivElement = {} as any
  const [bounds, setBounds] = createSignal({ w: 0, h: 0 })
  const [obs] = createSignal(
    new ResizeObserver(() => {
      setBounds({ w: props.container.clientWidth, h: props.container.clientHeight })
    })
  )

  onMount(() => {
    setBounds({ w: props.container.clientWidth, h: props.container.clientHeight })
    obs().observe(props.container)
  })

  onCleanup(() => {
    obs().disconnect()
  })

  const body = createMemo(() => {
    if (!props.body) return null

    const expr = getEmoteExpressions(props.expression || 'neutral')
    return {
      ...props.body,
      ...expr,
    }
  })

  const getStyle = createMemo(() => {
    // console.log('W', props.container?.clientWidth, ',', bound.clientWidth, ',', max.w)
    // console.log('H', props.container?.clientHeight, ',', bound.clientHeight, ',', max.h)
    const { w, h } = bounds()
    const calc = calcBounds(w, h)
    return {
      width: calc.w + 'px',
      height: calc.h + 'px',
      'min-width': calc.w + 'px',
      'min-height': calc.h + 'px',
    }
  })

  return (
    <Show when={props.body}>
      <div
        ref={bound!}
        class={`relative mx-auto flex h-full w-full select-none justify-center`}
        style={{ height: getStyle().height, 'grid-area': 'preview' }}
        // style={{ width: props.container.clientWidth + 'px' }}
      >
        <div class="absolute left-0 right-0 top-0  mx-auto rounded-md" style={getStyle()} />
        <AvatarCanvas zoom={props.zoom} body={body()!} style={getStyle()}></AvatarCanvas>

        {/* <Draggable onChange={dragging} onDone={dragged}></Draggable> */}
      </div>
    </Show>
  )
}

export default AvatarContainer
