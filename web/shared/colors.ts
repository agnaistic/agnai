import { JSX } from 'solid-js'

let sizeTimeout: NodeJS.Timeout
window.addEventListener('resize', updatePageVars)
updatePageVars()

function updatePageVars() {
  if (sizeTimeout) {
    clearTimeout(sizeTimeout)
  }

  sizeTimeout = setTimeout(() => {
    setRootVariable('window-width', `${window.innerWidth}px`)
    setRootVariable('window-height', `${window.innerHeight}px`)
  }, 10)
}

export function getRgbaFromVar(cssVar: string, opacity: number, id?: string): JSX.CSSProperties {
  const hex = getSettingColor(cssVar)
  const rgb = hexToRgb(hex)
  if (!rgb) return {}

  const background = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`

  if (id) {
    setRootVariable(`--rgba-${id}`, background)
  }

  return {
    background,
    'backdrop-filter': 'blur(5px)',
  }
}

/**
 * @param name E.g. bg-100, hl-800, rose-300
 */
export function getRootVariable(name: string) {
  const root = document.documentElement
  const value = getComputedStyle(root).getPropertyValue(name.startsWith('--') ? name : `--${name}`)
  return value
}

export function setRootVariable(name: string, value: string) {
  const root = document.documentElement
  root.style.setProperty(name.startsWith('--') ? name : `--${name}`, value)
}

export function parseHex(hex: string) {
  if (!hex.startsWith('#')) hex = '#' + hex
  const rgb = hex.slice(1, 7)
  const a = parseInt(hex.slice(7, 9), 16)
  const { r, g, b } = hexToRgb(rgb)!
  return { hex: rgb, r, g, b, alpha: isNaN(a) ? undefined : a / 255, rgba: hex }
}

export function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim())
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
        rgb: `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`,
      }
    : null
}

/**
 * @param name E.g. bg-100, hl-800, rose-300
 */
export function getRootRgb(name: string) {
  const value = getRootVariable(name)
  return hexToRgb(value)!
}

export function getSettingColor(color: string) {
  if (!color) return ''
  if (color.startsWith('#')) return color
  return getRootVariable(color)
}

export function getColorShades(color: string) {
  const colors: string[] = [adjustColor(color, -100), color]
  for (let i = 2; i <= 9; i++) {
    const next = adjustColor(color, i * 100)
    colors.push(next)
  }

  return colors
}

export function getAsCssVar(color: string) {
  if (color.startsWith('--')) return `var(${color})`
  return `var(--${color})`
}

export function adjustColor(color: string, percent: number, target = 0) {
  if (color.startsWith('--')) {
    color = getSettingColor(color)
  } else if (!color.startsWith('#')) {
    color = '#' + color
  }

  const step = [0, 0, 0]

  const hex = [1, 3, 5]
    .map((v, i) => {
      const val = parseInt(color.substring(v, v + 2), 16)
      step[i] = target !== 0 ? (val + target) / 100 : 0
      return val
    })
    .map((v, i) => {
      if (target !== 0) return v + percent * step[i]
      return (v * (100 + percent)) / 100
    })
    .map((v) => Math.min(v, 255))
    .map((v) => Math.round(v))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')

  return '#' + hex
}
