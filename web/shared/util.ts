import { UnwrapBody, assertValid } from 'frisker'
import { ADAPTER_LABELS, AIAdapter } from '../../common/adapters'
import type { Option } from './Select'
import { createEffect, onCleanup } from 'solid-js'

type FormRef = {
  [key: string]:
    | 'string'
    | 'string?'
    | readonly string[]
    | 'boolean'
    | 'number'
    | 'number?'
    | 'boolean?'
}

const PREFIX_CACHE_KEY = 'agnai-asset-prefix'

let assetPrefix: string = localStorage.getItem(PREFIX_CACHE_KEY) || ''

export function getAssetPrefix() {
  return assetPrefix
}

export function getAssetUrl(filename: string) {
  const isFile =
    filename.startsWith('/assets') ||
    filename.startsWith('assets/') ||
    filename.endsWith('.png') ||
    filename.endsWith('.jpg') ||
    filename.endsWith('.jpeg')

  if (!isFile) return filename

  const infix = assetPrefix.endsWith('/') || filename.startsWith('/') ? '' : '/'
  return `${assetPrefix}${infix}${filename}`
}

export function setAssetPrefix(prefix: string) {
  localStorage.setItem(PREFIX_CACHE_KEY, prefix)
  assetPrefix = prefix
}

export function getForm<T = {}>(evt: Event | HTMLFormElement): T {
  evt.preventDefault?.()
  const target = evt instanceof HTMLFormElement ? evt : (evt.target as HTMLFormElement)
  const form = new FormData(target as HTMLFormElement)

  const disable = enableAll(target)

  const body = Array.from(form.entries()).reduce((prev, [key, value]) => {
    Object.assign(prev, { [key]: value })
    return prev
  }, {})

  disable()

  return body as any
}

type Field = HTMLSelectElement | HTMLInputElement

export function getStrictForm<T extends FormRef>(
  evt: Event | HTMLFormElement,
  body: T,
  partial?: boolean
) {
  evt.preventDefault?.()
  const target = evt instanceof HTMLFormElement ? evt : (evt.target as HTMLFormElement)

  const disable = enableAll(target)
  const form = new FormData(target as HTMLFormElement)

  const values = Object.keys(body).reduce((prev, curr) => {
    const type = body[curr]
    let value: string | number | boolean | undefined = form.get(curr)?.toString()

    if (type === 'boolean' || type === 'boolean?') {
      if (value === 'on') value = true
      if (value === undefined) value = false
    }

    if ((type === 'number' || type === 'number?') && value !== undefined) {
      value = +value
    }
    prev[curr] = value
    return prev
  }, {} as any) as UnwrapBody<T>

  disable()

  assertValid(body, values, partial)
  return values
}

export function getFormEntries(evt: Event | HTMLFormElement): Array<[string, string]> {
  evt.preventDefault?.()
  const target = evt instanceof HTMLFormElement ? evt : (evt.target as HTMLFormElement)
  const disable = enableAll(target)
  const form = new FormData(target as HTMLFormElement)
  const entries = Array.from(form.entries()).map(
    ([key, value]) => [key, value.toString()] as [string, string]
  )
  disable()

  return entries
}

export function formatDate(value: string | number | Date) {
  const date = new Date(value)
  const str = date.toString()
  const day = date.getDate()
  const month = str.slice(4, 7)
  const time = str.slice(16, 24)

  return `${month} ${day} ${time}`
}

export function toDuration(valueSecs: number | Date, full?: boolean) {
  if (valueSecs instanceof Date) {
    valueSecs = Math.round((Date.now() - valueSecs.valueOf()) / 1000)
  }

  if (valueSecs === 0) {
    if (full) return '0s'
    return '0 seconds'
  }
  const {
    duration: [days, hours, minutes, seconds],
  } = toRawDuration(valueSecs)

  if (full) {
    return [`${days}d`, `${hours}h`, `${minutes}m`, `${seconds}s`]
      .filter((time) => !time.startsWith('0'))
      .join(':')
  }

  if (days) {
    return `${days} day${days > 1 ? 's' : ''}`
  }

  if (hours) {
    return `${hours} hour${hours > 1 ? 's' : ''}`
  }

  if (minutes) {
    return `${minutes} min${minutes > 1 ? 's' : ''}`
  }

  return `${seconds} seconds`
}

export function elapsedSince(date: string | Date, offsetMs: number = 0) {
  const diff = Date.now() - new Date(date).valueOf() + offsetMs
  const elapsed = Math.floor(diff / 1000)
  if (elapsed < 60) return 'a moment'
  return toDuration(Math.floor(elapsed))
}

const ONE_HOUR = 3600
const ONE_DAY = 86400

type Duration = [number, number, number, number]

function toRawDuration(valueSecs: number) {
  const days = Math.floor(valueSecs / ONE_DAY)
  const hours = Math.floor(valueSecs / ONE_HOUR) % 24
  const mins = Math.floor(valueSecs / 60) % 60
  const secs = Math.ceil(valueSecs % 60)

  return {
    duration: [days, hours, mins, secs] as Duration,
    seconds: valueSecs,
    text: valueSecs <= 0 ? 'now' : `${days}d:${hours}h:${mins}m:${secs}s`.replace('0d:', ''),
  }
}

export function adaptersToOptions(adapters: AIAdapter[]): Option[] {
  return adapters.map((adp) => ({ label: ADAPTER_LABELS[adp], value: adp }))
}

export function toEntityMap<T extends { _id: string }>(list: T[]): Record<string, T> {
  const map = list.reduce((prev, curr) => {
    prev[curr._id] = curr
    return prev
  }, {} as Record<string, T>)

  return map
}

/**
 * Disabled form fields cannot be accessed using `form.get` or `form.entries`.
 * To circumvent this, we will enable all fields then disable them once we've accessed the fields
 */
function enableAll(form: HTMLFormElement) {
  const elements = form.querySelectorAll('.form-field') as NodeListOf<Field>

  const disabled: Field[] = []
  for (const ele of elements) {
    if (ele.disabled) {
      disabled.push(ele)
      ele.disabled = false
    }
  }

  return () => {
    for (const ele of disabled) {
      ele.disabled = true
    }
  }
}

export function capitalize(input: string) {
  return input.slice(0, 1).toUpperCase() + input.slice(1)
}

export function toDropdownItems(values: string[] | readonly string[]): Option[] {
  return values.map((value) => ({ label: capitalize(value), value }))
}

export function debounce<T extends Function>(fn: T, secs = 2): T {
  let timer: any

  const wrapped = (...args: any[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn.apply(null, args), secs * 1000)
  }

  return wrapped as any
}

/**
 * @param name E.g. bg-100, hl-800, rose-300
 */
export function getRootVariable(name: string) {
  const root = document.documentElement
  const value = getComputedStyle(root).getPropertyValue(`--${name}`)
  return value
}

export function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim())
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
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

export function toMap<T extends { _id: string }>(list: T[]): Record<string, T> {
  const map = list.reduce((prev, curr) => Object.assign(prev, { [curr._id]: curr }), {})
  return map
}

export const alphaCaseInsensitiveSort = (
  a: string,
  b: string,
  direction: 'asc' | 'desc' = 'asc'
) => {
  const modifier = direction === 'asc' ? 1 : -1
  if (a.toLowerCase() < b.toLowerCase()) {
    return -1 * modifier
  } else if (a.toLowerCase() > b.toLowerCase()) {
    return 1 * modifier
  } else {
    return 0
  }
}

/**
 * Ascending by default
 * @param prop
 * @param dir
 */
export function sort<T>(prop: keyof T, dir?: 'asc' | 'desc') {
  const mod = dir === 'asc' ? 1 : -1
  return (l: T, r: T) => (l[prop] > r[prop] ? mod : l[prop] === r[prop] ? 0 : -mod)
}

export const setComponentPageTitle = (newTitle: string) => {
  createEffect(() => {
    document.title = `${newTitle} - Agnaistic`

    onCleanup(() => {
      document.title = 'Agnaistic'
    })
  })

  const updateTitle = (newTitle: string) => {
    document.title = `${newTitle} - Agnaistic`
  }

  // setComponentPageTitle must be called in order for consumers to
  // obtain updateComponentPageTitle, to prevent consumers from calling
  // updateComponentPageTitle on its own which would change the title without
  // the onCleanup hook.
  return { updateTitle }
}

export function find<T, K extends keyof T>(values: T[], key: K, val: T[K]): T | undefined {
  for (const value of values) {
    if (value[key] === val) return value
  }
}
