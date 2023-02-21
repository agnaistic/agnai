import { Component, JSX } from 'solid-js'

type Position = 'left' | 'right' | 'bottom' | 'top'

const Tooltip: Component<{
  position?: Position
  children: JSX.Element
  tip: string | JSX.Element
}> = (props) => {
  return (
    <div class="tooltip">
      {props.children}
      <div
        class="tooltip-text rounded-xl bg-slate-600 px-2 py-1"
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
      return { top: '-5px', right: '105%' }

    case 'right':
      return { top: '-5px', left: '105%' }

    case 'top':
      return { width: '128px', bottom: '100%', left: '50%', marginLeft: '-64px' }

    case 'bottom':
    default:
      return { width: '128px', top: '200%', right: '50%', marginLeft: '-64px' }
  }
}

export default Tooltip
