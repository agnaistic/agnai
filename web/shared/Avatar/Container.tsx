import { Component, Show, createMemo, createSignal, onCleanup, onMount } from 'solid-js'
import { EmoteType, FullSprite } from '/common/types/sprite'
import AvatarCanvas from './Canvas'
import { getEmoteExpressions } from '/web/asset/sprite'
import { calcBounds } from './hooks'
import { asyncFrame, createDebounce } from '../util'

const AvatarContainer: Component<{
  /**
   * We optionally pass in a character ID to retain a single cache entry for a character
   * If no ID is provided, the sprite will be hashed by its sprite composition + colors
   */
  container: HTMLElement
  expression?: EmoteType
  body?: FullSprite
  zoom?: number
}> = (props) => {
  const [bounds, setBounds] = createSignal({ w: 0, h: 0 })

  const [slowBounds, cleanup] = createDebounce(
    (dims: { w: number; h: number }) => setBounds(dims),
    50
  )

  const [obs] = createSignal(
    new ResizeObserver(async () => {
      await asyncFrame()
      slowBounds({ w: props.container.clientWidth, h: props.container.clientHeight })
    })
  )

  onMount(() => {
    slowBounds({ w: props.container.clientWidth, h: props.container.clientHeight })
    obs().observe(props.container)
  })

  onCleanup(() => {
    obs().disconnect()
    cleanup()
  })

  const body = createMemo(() => {
    if (!props.body) return null

    const expr = getEmoteExpressions(props.body, props.expression || 'neutral')
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
      <AvatarCanvas zoom={props.zoom} body={body()!} style={getStyle()} />
    </Show>
  )
}

export default AvatarContainer
