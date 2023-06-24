import { Component, createSignal } from 'solid-js'
import { useEffect } from './hooks'

const mousePos = { x: 0, y: 0 }
document.addEventListener('mousemove', (ev) => {
  mousePos.x = ev.clientX
  mousePos.y = ev.clientY
})

const Draggable: Component<{
  onChange: (deltaX: number, deltaY: number) => void
  onDone: (deltaX: number, deltaY: number) => void
  children: any
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
    }

    document.addEventListener('mouseup', listener)

    const timer = setInterval(() => {
      if (!watch()) return
      const deltaX = mousePos.x - x()
      const deltaY = mousePos.y - y()
      props.onChange(deltaX, deltaY)
    }, 20)

    return () => {
      clearInterval(timer)
      document.removeEventListener('mouseup', listener)
    }
  })

  return (
    <div
      class="select-all"
      draggable
      onMouseDown={(ev) => {
        setWatch(true)
        setX(ev.clientX)
        setY(ev.clientY)
      }}
      ref={ref}
    >
      {props.children}
    </div>
  )
}

export default Draggable
