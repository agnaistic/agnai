import { Component, createSignal, onCleanup, onMount } from 'solid-js'

type Props = {
  squish?: boolean
  onEnter?: () => void
  onLeave?: () => void
}

const IsVisible: Component<Props> = (props) => {
  let ref: any

  const [visible, setVisible] = createSignal(false)
  const [obs, setObs] = createSignal<IntersectionObserver>()

  onMount(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (visible()) return
          props.onEnter?.()
          setVisible(true)
          return
        }

        if (!visible()) return
        props.onLeave?.()
        setVisible(false)
      },
      {
        root: null,
        threshold: 0.1,
      }
    )

    setObs(observer)

    observer.observe(ref)
  })

  onCleanup(() => {
    obs()?.unobserve(ref)
  })

  return (
    <span style={{ 'max-height': props.squish ? '1px' : undefined }} ref={ref}>
      &nbsp;
    </span>
  )
}

export default IsVisible
