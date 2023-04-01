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

const Loading: Component<{ type?: Dot }> = (props) => {
  return <div class={`dot-${props.type || 'spin'}`}></div>
}

export default Loading
