import { Component, JSX, Show, createMemo } from 'solid-js'
import { getSettingColor, getAsCssVar, userStore } from '../store'
import { useBgStyle } from './hooks'
import { hooks } from './util'

export const Card: Component<{
  children: JSX.Element
  class?: string
  bgOpacity?: number
  border?: boolean
  bg?: string
  hide?: boolean
}> = (props) => {
  const cardBg = useBgStyle({
    hex: props.bg ? getSettingColor(props.bg) : 'bg-800',
    blur: false,
    opacity: props.bgOpacity ?? 0.08,
  })

  const hide = createMemo(() => (props.hide ? 'hidden' : ''))

  return (
    <div
      class={`rounded-lg p-3 ${props.class ?? ''} ${hide()}`}
      style={{
        border: props.border ? '1px solid var(--bg-600)' : 0,
        ...cardBg(),
      }}
    >
      {props.children}
    </div>
  )
}

export const SolidCard: Component<{
  children: JSX.Element
  class?: string
  bg?: string
  hover?: string | boolean
  border?: boolean
}> = (props) => {
  const bg = createMemo(() => (props.bg ? getAsCssVar(props.bg) : '--bg-800'))
  const hover = createMemo(() => {
    if (!props.hover) return {}
    if (props.hover === true) return { background: getAsCssVar('--bg-600'), cursor: 'pointer' }
    return { background: getSettingColor(props.hover), cursor: 'pointer' }
  })

  return (
    <div
      class={`rounded-lg p-3 ${props.class ?? ''}`}
      style={hooks({
        border: props.border ? '1px solid var(--bg-600)' : 0,
        background: bg(),
        hover: hover(),
      })}
    >
      {props.children}
    </div>
  )
}

type CardType =
  | 'bg'
  | 'hl'
  | 'sky'
  | 'teal'
  | 'cyan'
  | 'orange'
  | 'blue'
  | 'pink'
  | 'rose'
  | 'purple'
  | 'premium'
  | 'truegray'
  | 'bluegray'
  | 'coolgray'
  | 'green'
  | 'lime'

export const TitleCard: Component<{
  children: JSX.Element
  title?: JSX.Element | string
  type?: CardType
  class?: string
  center?: boolean
}> = (props) => {
  const cfg = userStore((s) => s.ui)

  const bg = createMemo((): JSX.CSSProperties => {
    const type = props.type || 'bg'
    const base = type === 'bg' || cfg.mode === 'dark' || type === 'hl' ? 800 : 100
    const mod = type === 'bg' || cfg.mode === 'dark' || type === 'hl' ? -200 : 200

    return {
      'background-color': `var(--${type}-${base})`,
      'border-color': `var(--${type}-${base + mod})`,
    }
  })
  return (
    <div class={`flex flex-col gap-2 rounded-md border-[1px] ${props.class || ''}`} style={bg()}>
      <Show when={!!props.title}>
        <div
          class={`flex rounded-t-md px-2 pt-2 text-xl font-bold ${
            props.center ? 'justify-center' : ''
          }`}
          style={bg()}
        >
          {props.title}
        </div>
      </Show>
      <div class="px-2 pb-2" classList={{ 'pt-2': !props.title }}>
        {props.children}
      </div>
    </div>
  )
}

export const Pill: Component<{
  type?: CardType
  children: JSX.Element
  inverse?: boolean
  small?: boolean
  onClick?: () => void
}> = (props) => {
  const cfg = userStore((s) => s.ui)

  const bg = createMemo((): JSX.CSSProperties => {
    const type = props.type || 'bg'
    let base = type === 'bg' || cfg.mode === 'dark' || type === 'hl' ? 800 : 200
    let mod = type === 'bg' || cfg.mode === 'dark' || type === 'hl' ? -400 : 400
    let text = 200

    if (props.inverse) {
      base = base === 800 ? 200 : 800
      mod *= -1
      text = 800
    }

    return {
      'background-color': `var(--${type}-${base + mod})`,
      'border-color': `var(--${type}-${base})`,
      color: `var(--text-${text})`,
    }
  })

  return (
    <span
      class={`rounded-md border-[1px] px-2 py-1 text-sm`}
      style={bg()}
      onClick={props.onClick}
      classList={{
        'border-[1px]': !props.small,
        'border-0': props.small,
        'cursor-pointer': !!props.onClick,
        'py-1': !props.small,
        'py-[2x]': props.small,
      }}
    >
      {props.children}
    </span>
  )
}

// For testing all cards
export const cardTitleTypes: CardType[] = [
  'bg',
  'hl',
  'sky',
  'teal',
  'cyan',
  'orange',
  'blue',
  'pink',
  'rose',
  'purple',
  'premium',
  'coolgray',
  'bluegray',
  'coolgray',
]
