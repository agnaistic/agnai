import { Component, createSignal } from 'solid-js'
import { useEffect } from './hooks'

const mousePos = { x: 0, y: 0 }
document.addEventListener('mousemove', (ev) => {
  mousePos.x = ev.clientX
  mousePos.y = ev.clientY
})

document.addEventListener('touchmove', (ev) => {
  mousePos.x = ev.touches[0].clientX
  mousePos.y = ev.touches[0].clientY
})

const Draggable: Component<{
  onChange: (deltaX: number, deltaY: number) => void
  onDone: (deltaX: number, deltaY: number) => void
  onTransition?: (dragging: boolean) => void
  children: any
  class?: string
  classList?: Record<string, boolean>
}> = (props) => {
  let ref: any

  const [x, setX] = createSignal(0)
  const [y, setY] = createSignal(0)
  const [watch, setWatch] = createSignal(false)

  useEffect(() => {
    const listener = () => {
      if (!watch()) return
      setWatch(false)
      const deltaX = mousePos.x - x()
      const deltaY = mousePos.y - y()
      props.onDone(deltaX, deltaY)
      props.onTransition?.(false)
    }

    document.addEventListener('mouseup', listener)
    document.addEventListener('touchend', listener)

    const timer = setInterval(() => {
      if (!watch()) return
      const deltaX = mousePos.x - x()
      const deltaY = mousePos.y - y()
      props.onChange(deltaX, deltaY)
    }, 20)

    return () => {
      clearInterval(timer)
      document.removeEventListener('mouseup', listener)
      document.removeEventListener('touchend', listener)
    }
  })

  return (
    <div
      draggable
      class={`select-all ${props.class || ''}`}
      classList={props.classList}
      onTouchStart={(ev) => {
        mousePos.x = ev.touches[0].clientX
        mousePos.y = ev.touches[0].clientY
        setWatch(true)
        setX(ev.touches[0].clientX)
        setY(ev.touches[0].clientY)
        props.onTransition?.(true)
      }}
      onMouseDown={(ev) => {
        setWatch(true)
        setX(ev.clientX)
        setY(ev.clientY)
        props.onTransition?.(true)
      }}
      ref={ref}
    >
      {props.children}
    </div>
  )
}

export default Draggable
