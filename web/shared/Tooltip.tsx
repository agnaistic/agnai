import { Component, JSX, Show, onCleanup, onMount } from 'solid-js'
import { setRootVariable } from './colors'

type Position = 'left' | 'right' | 'bottom' | 'top'

const Tooltip: Component<{
  position?: Position
  children: JSX.Element
  tip: string | JSX.Element
  class?: string
  followCursor?: boolean
  disable?: boolean
}> = (props) => {
  let ref: HTMLDivElement

  onMount(() => {
    if (props.followCursor) {
      document.addEventListener('mousemove', updateCursorVars)
    }
  })

  onCleanup(() => {
    document.removeEventListener('mousemove', updateCursorVars)
  })

  return (
    <div
      ref={ref!}
      class={`tooltip select-none ${props.class || ''}`}
      style={{ position: props.followCursor ? 'inherit' : 'relative' }}
    >
      {props.children}
      <Show when={!!props.tip && !props.disable}>
        <div
          class="tooltip-text bg-700 z-10 hidden min-w-[128px] rounded-md border-[1px] border-[var(--bg-900)] px-2 py-1 text-sm sm:flex"
          classList={{ 'tooltip-cursor': props.followCursor }}
          style={props.followCursor ? {} : getPosition(props.position)}
        >
          {props.tip}
        </div>
      </Show>
    </div>
  )
}

function getPosition(pos?: Position) {
  switch (pos) {
    case 'left':
      return { top: '-5px', right: '110%' }

    case 'right':
      return { top: '-5px', left: '110%' }

    case 'top':
      return { width: 'fit-content', bottom: '100%', left: '50%' }

    case 'bottom':
    default:
      return { width: 'fit-content', top: '120%', right: '50%' }
  }
}

export default Tooltip

function updateCursorVars(e: MouseEvent) {
  setRootVariable('tooltip-x', `${e.pageX}px`)
  setRootVariable('tooltip-y', `${e.pageY}px`)
}
