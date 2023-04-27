import { Component, JSX } from 'solid-js'

type Position = 'left' | 'right' | 'bottom' | 'top'

const Tooltip: Component<{
  position?: Position
  children: JSX.Element
  tip: string | JSX.Element
}> = (props) => {
  return (
    <div class="tooltip select-none">
      {props.children}
      <div
        class="tooltip-text hidden w-[128px] justify-center rounded-xl bg-[var(--bg-700)] px-2 py-1 text-sm sm:flex"
        style={getPosition(props.position)}
      >
        {props.tip}
      </div>
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
      return { width: '128px', bottom: '100%', left: '50%' }

    case 'bottom':
    default:
      return { width: '128px', top: '120%', right: '50%' }
  }
}

export default Tooltip
