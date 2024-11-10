import { Accessor, Component, JSX, Show, createMemo } from 'solid-js'
import { userStore } from '../store'
import { useBgStyle } from './hooks'
import { hooks } from './util'
import { getAsCssVar, getRgbaFromVar, getSettingColor } from './colors'

type Size = 'sm' | 'md' | 'lg'

export const Card: Component<{
  children: JSX.Element
  class?: string
  classList?: any
  bgOpacity?: number
  border?: boolean
  bg?: string
  hide?: boolean | Accessor<boolean>
  size?: Size
  ariaRole?: JSX.AriaAttributes['role']
  ariaLabel?: string
}> = (props) => {
  const cardBg = useBgStyle({
    hex: props.bg ? props.bg : 'bg-700',
    blur: false,
    opacity: props.bgOpacity ?? 0.08,
  })

  const hide = createMemo(() => {
    if (typeof props.hide === 'function') return props.hide()
    return props.hide
  })

  return (
    <div
      class={`rounded-lg ${props.class ?? ''}`}
      classList={{
        hidden: hide(),
        'p-1': props.size === 'sm',
        'p-2': props.size === 'md',
        'p-3': !props.size || props.size === 'lg',
        ...props.classList,
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
  borderColor?: string
  title?: string | JSX.Element
}> = (props) => {
  const cfg = userStore((s) => s.ui)

  const titleBg = createMemo(() => {
    const color = getRgbaFromVar(`--${props.type || 'hl'}-500`, 1)
    return color.background
  })

  const bg = createMemo((): JSX.CSSProperties => {
    const borderColor = props.borderColor ? getAsCssVar(props.borderColor) : undefined
    if (props.bg) {
      return {
        'background-color': getAsCssVar(props.bg),
        border: borderColor
          ? `1px solid ${borderColor}`
          : props.border
          ? '1px solid var(--bg-600)'
          : 0,
      }
    }

    const type = props.type || 'bg'
    const base = type === 'bg' || cfg.mode === 'dark' || type === 'hl' ? 800 : 100
    const mod = type === 'bg' || cfg.mode === 'dark' || type === 'hl' ? -200 : 200

    return {
      'background-color': `var(--${type}-${base})`,
      border: borderColor ? `1px solid ${borderColor}` : `1px solid var(--${type}-${base + mod})`,
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
      <Show when={props.title}>
        <div
          class="mb-2 flex w-full justify-center rounded-md py-1 font-bold"
          style={{ background: titleBg() }}
        >
          {props.title}
        </div>
      </Show>
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
  contentClass?: string
  bg?: string
}> = (props) => {
  const cfg = userStore((s) => s.ui)

  const bg = createMemo((): JSX.CSSProperties => {
    const type = props.type || 'bg'
    const base = type === 'bg' || cfg.mode === 'dark' || type === 'hl' ? 800 : 100
    const mod = type === 'bg' || cfg.mode === 'dark' || type === 'hl' ? -200 : 200

    const bgColor = props.bg
      ? (getRgbaFromVar(props.bg, 1)?.background as string)
      : `var(--${type}-${base})`

    return {
      'background-color': bgColor,
      border: `1px solid var(--${type}-${base + mod})`,
      'border-radius': '0.375rem',
    }
  })

  return (
    <div
      class={`flex flex-col gap-2 ${props.class || ''}`}
      style={bg()}
      role={props.ariaRole}
      aria-label={props.ariaLabel}
    >
      <Show when={!!props.title}>
        <div
          class={`flex rounded-t-md px-2 pt-2 text-lg font-bold ${
            props.center ? 'justify-center' : ''
          }`}
        >
          {props.title}
        </div>
      </Show>
      <div
        class={`rounded-b-md px-2 pb-2 text-sm ${props.contentClass || ''}`}
        classList={{ 'pt-2': !props.title }}
      >
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
  class?: string
  opacity?: number
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

    const rgba = getRgbaFromVar(`--${type}-${base + mod}`, props.opacity ?? 1)

    return {
      'background-color': rgba.background || '',
      'border-color': `var(--${type}-${base})`,
      color: (props.class || '').includes('text-') ? undefined : `var(--text-${text})`,
    }
  })

  return (
    <span
      class={`flex h-fit items-center border-[1px] px-2 py-1 ${props.class || ''}`}
      style={bg()}
      onClick={props.onClick}
      classList={{
        'w-fit': !props.class?.includes('w-'),
        'px-2': !props.class?.includes('px-'),
        'border-[1px]': !props.small,
        'border-0': props.small,
        'cursor-pointer': !!props.onClick,
        'py-1': !props.class?.includes('py-') && !props.small,
        'py-[2px]': !props.class?.includes('py-') && props.small,
        'rounded-l-md': !props.class?.includes('rounded-') && props.corners?.l !== false,
        'rounded-r-md': !props.class?.includes('rounded-') && props.corners?.r !== false,
        'text-sm': !props.class?.includes('text'),
      }}
      role={props.ariaRole}
      aria-label={props.ariaLabel}
    >
      {props.children}
    </span>
  )
}

export const Badge: Component<{ children: any; type?: CardType; inverse?: boolean }> = (props) => {
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
    <>
      <span
        style={bg()}
        class={`flex h-5 w-5 items-center justify-center rounded-full text-[0.6rem] font-bold text-white`}
      >
        {props.children}
      </span>
    </>
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
