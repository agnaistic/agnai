import { Component } from 'solid-js'

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

const Loading: Component<{ type?: Dot; height?: string }> = (props) => {
  return (
    <div class="flex max-h-[3rem] min-h-[3rem] min-w-[3rem] max-w-[3rem] items-center justify-center">
      <div class={`dot-${props.type || 'spin'}`}></div>
    </div>
  )
}

export default Loading
