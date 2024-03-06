import { Component, JSX, Show, createMemo } from 'solid-js'
import { getSettingColor, getAsCssVar, userStore } from '../store'
import { useBgStyle } from './hooks'
import { hooks } from './util'

type Size = 'sm' | 'md' | 'lg'

export const Card: Component<{
  children: JSX.Element
  class?: string
  bgOpacity?: number
  border?: boolean
  bg?: string
  hide?: boolean
  size?: Size
  ariaRole?: JSX.AriaAttributes['role']
  ariaLabel?: string
}> = (props) => {
  const cardBg = useBgStyle({
    hex: props.bg ? props.bg : 'bg-700',
    blur: false,
    opacity: props.bgOpacity ?? 0.08,
  })

  return (
    <div
      class={`rounded-lg ${props.class ?? ''}`}
      classList={{
        hidden: props.hide,
        'p-1': props.size === 'sm',
        'p-2': props.size === 'md',
        'p-3': !props.size || props.size === 'lg',
      }}
      style={hooks({
        border: props.border ? '1px solid var(--bg-600)' : 0,
        ...cardBg(),
      })}
      role={props.ariaRole}
      aria-label={props.ariaLabel}
    >
      {props.children}
    </div>
  )
}

export const SolidCard: Component<{
  children: JSX.Element
  class?: string
  size?: Size
  type?: CardType
  bg?: string
  hover?: string | boolean
  border?: boolean
}> = (props) => {
  const cfg = userStore((s) => s.ui)

  const bg = createMemo((): JSX.CSSProperties => {
    if (props.bg) {
      return {
        'background-color': getAsCssVar(props.bg),
        border: props.border ? '1px solid var(--bg-600)' : 0,
      }
    }

    const type = props.type || 'bg'
    const base = type === 'bg' || cfg.mode === 'dark' || type === 'hl' ? 800 : 100
    const mod = type === 'bg' || cfg.mode === 'dark' || type === 'hl' ? -200 : 200

    return {
      'background-color': `var(--${type}-${base})`,
      border: `1px solid var(--${type}-${base + mod})`,
    }
  })

  // const bg = createMemo(() => (props.bg ? getAsCssVar(props.bg) : '--bg-800'))

  const hover = createMemo(() => {
    if (!props.hover) return {}
    if (props.hover === true) return { background: getAsCssVar('--bg-600'), cursor: 'pointer' }
    return { background: getSettingColor(props.hover), cursor: 'pointer' }
  })

  return (
    <div
      class={`rounded-lg ${props.class ?? ''}`}
      classList={{
        'p-1': props.size === 'sm',
        'p-2': props.size === 'md',
        'p-3': !props.size || props.size === 'lg',
      }}
      style={hooks({
        ...bg(),
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
  ariaRole?: JSX.AriaAttributes['role']
  ariaLabel?: string
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
    <div
      class={`flex flex-col gap-2 rounded-md border-[1px] ${props.class || ''}`}
      style={bg()}
      role={props.ariaRole}
      aria-label={props.ariaLabel}
    >
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
  ariaRole?: JSX.AriaAttributes['role']
  ariaLabel?: string
  corners?: { l?: boolean; r?: boolean }
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
      class={`border-[1px] px-2 py-1 text-sm`}
      style={bg()}
      onClick={props.onClick}
      classList={{
        'border-[1px]': !props.small,
        'border-0': props.small,
        'cursor-pointer': !!props.onClick,
        'py-1': !props.small,
        'py-[2px]': props.small,
        'rounded-l-md': props.corners?.l !== false,
        'rounded-r-md': props.corners?.r !== false,
      }}
      role={props.ariaRole}
      aria-label={props.ariaLabel}
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
