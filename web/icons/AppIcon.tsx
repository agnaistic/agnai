import { Component, createEffect } from 'solid-js'

export type IconProps = {
  size?: number | string
  color?: string
  class?: string
}

const AppIcon: Component<IconProps & { svg: string }> = (props) => {
  let ref: HTMLDivElement | undefined = undefined

  createEffect(() => {
    if (!ref) return

    for (const child of ref.children) {
      if (child.nodeName !== 'svg') continue
      const size = props.size || '24'
      child.setAttribute('width', size.toString())
      child.setAttribute('height', size.toString())
      child.setAttribute('stroke', 'currentColor')
      child.setAttribute('fill', 'currentColor')
      child.setAttribute('fill', props.color || 'var(--bg-100)')
    }
  })

  return <div ref={ref} innerHTML={props.svg} class={props.class || ''} />
}

export default AppIcon
