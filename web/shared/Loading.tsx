import { LoaderCircle } from 'lucide-solid'
import { Component, createMemo } from 'solid-js'
import { Portal } from 'solid-js/web'

type Dot =
  | 'elastic'
  | 'pulse'
  | 'flashing'
  | 'collision'
  | 'revolution'
  | 'carousel'
  | 'typing'
  | 'windmill'
  | 'bricks'
  | 'floating'
  | 'fire'
  | 'spin'
  | 'falling'
  | 'stretching'

const Loading: Component<{ type?: Dot }> = (props) => {
  return (
    <div class="flex max-h-[3rem] min-h-[3rem] min-w-[3rem] max-w-[3rem] items-center justify-center">
      <div class={`dot-${props.type || 'spin'}`}></div>
    </div>
  )
}

export const Spinner: Component<{ size?: number; class?: string; speed?: number }> = (props) => {
  const speed = createMemo(() => {
    return `${1.3 / (props.speed || 1)}s`
  })
  return (
    <div
      class={`absolute bottom-1/2 left-1/2 animate-spin ${props.class || ''}`}
      style={{
        'animation-duration': speed(),
        'animation-timing-function': 'linear',
        'animation-iteration-count': 'infinite',
      }}
    >
      <LoaderCircle size={props.size} />
    </div>
  )
}

export const PageSpinner: Component<{ size?: number; class?: string; speed?: number }> = (
  props
) => {
  return (
    <Portal>
      <div
        class={`fixed inset-0  top-0 z-[110] flex h-screen w-screen items-center justify-center bg-gray-900 bg-opacity-60`}
      >
        <RelativeSpinner size={props.size} speed={props.speed} class={props.class} />
      </div>
    </Portal>
  )
}

export const RelativeSpinner: Component<{
  size?: number
  class?: string
  speed?: number
  full?: boolean
}> = (props) => {
  const speed = createMemo(() => {
    return `${1.3 / (props.speed || 1)}s`
  })

  return (
    <div
      class={'animate-spin ' + props.class || ''}
      style={{
        'animation-duration': speed(),
        'animation-timing-function': 'linear',
        'animation-iteration-count': 'infinite',
      }}
    >
      <LoaderCircle size={props.size} />
    </div>
  )
}

export default Loading
