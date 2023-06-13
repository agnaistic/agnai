import { Component, JSX } from 'solid-js'
import { getSettingColor } from '../store'
import { useBgStyle } from './hooks'

export const Card: Component<{ children: JSX.Element; class?: string }> = (props) => {
  const cardBg = useBgStyle({
    hex: getSettingColor('bg-500'),
    blur: false,
    opacity: 0.08,
  })
  return (
    <div class={`rounded-lg p-3 ${props.class ?? ''}`} style={cardBg()}>
      {props.children}
    </div>
  )
}
