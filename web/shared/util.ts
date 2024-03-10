import { createHooks, recommended } from '@css-hooks/solid'
import * as lf from 'localforage'
import { UnwrapBody, Validator, assertValid } from '/common/valid'
import {
  ADAPTER_LABELS,
  AIAdapter,
  PresetAISettings,
  ThirdPartyFormat,
  adapterSettings,
} from '../../common/adapters'
import type { Option } from './Select'
import { createEffect, onCleanup } from 'solid-js'
import { UserState, settingStore, userStore } from '../store'
import { AppSchema } from '/common/types'
import { deepClone } from '/common/util'

const [css, hooks] = createHooks(recommended)

export { hooks, css }

export function downloadJson(content: string | object, filename: string = 'agnai_export') {
  const output = encodeURIComponent(
    typeof content === 'string' ? content : JSON.stringify(content, null, 2)
  )

  const anchor = document.createElement('a')
  anchor.href = `data:text/json:charset=utf-8,${output}`
  anchor.download = `${filename}.json`
  anchor.click()
  URL.revokeObjectURL(anchor.href)
}

export function getMaxChatWidth(chatWidth: UserState['ui']['chatWidth']) {
  switch (chatWidth) {
    case 'xl':
      return 'max-w-6xl'

    case '2xl':
      return 'max-w-7xl'

    case '3xl':
      return 'max-w-8xl'

    case 'fill':
      return 'max-w-none'

    case 'full':
    case 'narrow':
    default:
      return 'max-w-5xl'
  }
}

export const storage = {
  getItem,
  setItem,
  removeItem,
  clear,

  localGetItem,
  localSetItem,
  localRemoveItem,
  localClear,
  test,
}

export function isExpired(date?: string | Date) {
  if (!date) return true
  const comp = typeof date === 'string' ? new Date(date) : date
  if (isNaN(comp.valueOf())) return true

  return Date.now() >= comp.valueOf()
}

async function getItem(key: string): Promise<string | null> {
  try {
    return lf.getItem(key)
  } catch {
    return null
  }
}

async function setItem(key: string, value: string) {
  try {
    await lf.setItem(key, value)
  } catch (e: any) {
    console.warn('Failed to set local storage item', key, value, e)
  }
}

async function removeItem(key: string) {
  try {
    await lf.removeItem(key)
  } catch (e: any) {
    console.warn('Failed to remove local storage item', key, e)
  }
}

async function clear() {
  try {
    await lf.clear()
  } catch (e: any) {
    console.warn('Failed to clear local storage item', e)
  }
}
function localGetItem(key: string) {
  return localStorage.getItem(key)
}

function localSetItem(key: string, value: string) {
  localStorage.setItem(key, value)
}

function localRemoveItem(key: string) {
  localStorage.removeItem(key)
}

function localClear() {
  localStorage.clear()
}

function test(noThrow?: boolean) {
  const TEST_KEY = '___TEST'
  localStorage.setItem(TEST_KEY, 'ok')
  const value = localStorage.getItem(TEST_KEY)
  localStorage.removeItem(TEST_KEY)

  if (value !== 'ok') {
    if (!noThrow) throw new Error('Failed to retreive set local storage item')
    return false
  }

  return true
}

const PREFIX_CACHE_KEY = 'agnai-asset-prefix'

let assetPrefix: string = localStorage.getItem(PREFIX_CACHE_KEY) || ''

export function getAssetPrefix() {
  return assetPrefix
}

export function getAssetUrl(filename: string) {
  if (filename.startsWith('http:') || filename.startsWith('https:') || filename.startsWith('data:'))
    return filename

  const isFile =
    filename.startsWith('/assets') ||
    filename.startsWith('assets/') ||
    filename.endsWith('.png') ||
    filename.endsWith('.jpg') ||
    filename.endsWith('.jpeg') ||
    filename.endsWith('.mp3') ||
    filename.endsWith('.wav') ||
    filename.endsWith('.webm') ||
    filename.endsWith('.apng')

  if (!isFile) return filename

  const infix = assetPrefix.endsWith('/') || filename.startsWith('/') ? '' : '/'
  return `${assetPrefix}${infix}${filename}`
}

export function setAssetPrefix(prefix: string) {
  storage.setItem(PREFIX_CACHE_KEY, prefix)
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

export function getStrictForm<T extends Validator>(
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
      if (value === undefined || value === 'off') value = false
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

export function setFormField(ref: HTMLFormElement, field: string, value: any) {
  const elem = document.querySelector(`.form-field[name="${field}"]`)
  if (!elem) {
    console.warn(`[${field}] Could not update field: Element not found`)
    return
  }

  if ('value' in elem) {
    elem.value = value
  }
}

export function setFormFields(ref: HTMLFormElement, update: Record<string, any>) {
  for (const [field, value] of Object.entries(update)) {
    setFormField(ref, field, value)
  }
}

export function getFormEntries(evt: Event | HTMLFormElement): Array<[string, string]> {
  evt.preventDefault?.()
  const target = evt instanceof HTMLFormElement ? evt : (evt.target as HTMLFormElement)
  const disable = enableAll(target)
  const form = new FormData(target as HTMLFormElement)
  const entries = Array.from(form.entries()).map(
    ([key, value]) => [key, value.toString()] as [string, string]
  )

  const dangling = target.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>
  for (const input of dangling) {
    const prev = entries.find((e) => e[0] === input.id)
    if (prev) continue

    entries.push([input.id, input.checked ? 'on' : ''])
  }

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

export function createDebounce<T extends (...args: any[]) => void>(
  fn: T,
  ms: number
): [fn: (...args: Parameters<T>) => void, dispose: () => void] {
  let timeoutId: NodeJS.Timeout | null = null
  let callback: () => void

  return [
    (...args: Parameters<T>) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      callback = () => {
        fn.apply(null, args)
        timeoutId = null
      }
      timeoutId = setTimeout(callback, ms)
    },
    () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
        callback()
      }
    },
  ]
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

export function toMap<T extends { _id: string }>(list: T[]): Record<string, T> {
  const map = list.reduce((prev, curr) => Object.assign(prev, { [curr._id]: curr }), {})
  return map
}

export function alphaCaseInsensitiveSort(a: string, b: string, direction: 'asc' | 'desc' = 'asc') {
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

/**
 * This only works for shallow objects
 */
export function isDirty<T extends {}>(original: T, compare: T): boolean {
  const keys = new Set<keyof T>(Object.keys(original).concat(Object.keys(compare)) as any)

  for (const key of Array.from(keys)) {
    if (original[key] !== compare[key]) return true
  }

  return false
}

export function serviceHasSetting(
  service: AIAdapter | undefined,
  format: ThirdPartyFormat | undefined,
  ...props: Array<keyof PresetAISettings>
) {
  if (!service) {
    return true
  }

  for (const prop of props) {
    if (isValidServiceSetting(service, format, prop)) {
      return true
    }
  }

  return false
}

export function getAISettingServices(prop?: keyof PresetAISettings) {
  if (!prop) return
  const cfg = settingStore((s) => s.config)
  const base = adapterSettings[prop]
  const names: Array<AIAdapter | ThirdPartyFormat> = []
  for (const reg of cfg.registered) {
    if (reg.options.includes(prop)) names.push(reg.name)
  }

  return base?.concat(names)
}

export function isValidServiceSetting(
  service?: AIAdapter,
  format?: AppSchema.GenSettings['thirdPartyFormat'],
  prop?: keyof PresetAISettings
) {
  const services = getAISettingServices(prop)

  // Setting does not declare itself as a service setting
  if (!services || !service) return true

  if (services.includes(service)) return true
  if (!format) return false

  if (service !== 'kobold') return false

  for (const srv of services) {
    if (srv === format) return true
  }

  return false
}

export function applyDotProperty<T>(obj: T, property: string, value: any) {
  const props = property.split('.')

  let ref: any = obj

  for (let i = 0; i < props.length; i++) {
    const prop = props[i]
    if (i === props.length - 1) {
      ref[prop] = value
      break
    }

    if (!ref[prop]) {
      ref[prop] = {}
    }
    ref = ref[prop]
  }

  return obj
}

export function appendFormOptional(
  form: FormData,
  key: string,
  value: string | File | undefined,
  stringify: never
): void
export function appendFormOptional<T>(
  form: FormData,
  key: string,
  value: T,
  stringify?: (v: T) => string
): void
export function appendFormOptional(
  form: FormData,
  key: string,
  value: any,
  stringify?: (v: any) => string
) {
  if (!value) return
  if (stringify) form.append(key, stringify(value))
  else form.append(key, value as string | File)
}

/**
 * Like `appendFormOptional`, but does append the value if it is an empty string.
 * This might be what we want `appendFormOptional` to be, but I'm scared of breaking things.
 */
export function strictAppendFormOptional<T>(
  form: FormData,
  key: string,
  value: T,
  stringify?: (v: T) => string
) {
  if (value === null || value === undefined) return
  if (stringify) form.append(key, stringify(value))
  else form.append(key, value as string | File)
}

export function weightedRandom<T>(list: T[], getProbability: (v: T) => number): T {
  const total = list.reduce((sum, item) => sum + getProbability(item), 0)
  let random = Math.random() * total

  for (const item of list) {
    random -= getProbability(item)
    if (random < 0) {
      return item
    }
  }

  return list[list.length - 1]
}

type OmitKeys<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>

export function deepCloneAndRemoveFields<T, K extends keyof T>(
  input: T,
  fieldsToRemove: K[]
): OmitKeys<T, K> {
  const clone: T = JSON.parse(JSON.stringify(input))
  fieldsToRemove.forEach((field) => {
    delete (clone as any)[field]
  })
  return clone as OmitKeys<T, K>
}

export function asyncFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve))
}

export function getUsableServices() {
  const { user } = userStore.getState()
  const { config } = settingStore.getState()

  const services: AIAdapter[] = []

  for (const service of config.adapters) {
    if (isUsableService(service, config, user)) services.push(service)
  }

  return services
}

export function isUsableService(
  service: AIAdapter,
  config: AppSchema.AppConfig,
  user?: AppSchema.User
) {
  switch (service) {
    case 'agnaistic': {
      const level = user?.sub?.level ?? -1
      const match = config.subs.some((sub) => sub.level <= level)
      return match
    }

    case 'claude': {
      return !!user?.claudeApiKeySet || !!user?.claudeApiKey
    }

    case 'goose': {
      return !!user?.adapterConfig?.goose?.apiKeySet || !!user?.adapterConfig?.goose?.apiKey
    }

    case 'mancer': {
      return !!user?.adapterConfig?.mancer?.apiKeySet || !!user?.adapterConfig?.mancer?.apiKey
    }

    case 'novel': {
      return !!user?.novelVerified || !!user?.novelApiKey
    }

    case 'openai': {
      return !!user?.oaiKeySet || !!user?.oaiKey
    }

    case 'openrouter': {
      return (
        !!user?.adapterConfig?.openrouter?.apiKeySet || !!user?.adapterConfig?.openrouter?.apiKey
      )
    }

    case 'replicate': {
      return (
        !!user?.adapterConfig?.replicate?.apiTokenSet || !!user?.adapterConfig?.replicate?.apiToken
      )
    }

    case 'scale': {
      return !!user?.scaleApiKeySet || !!user?.scaleApiKey
    }

    case 'horde':
    case 'kobold':
    case 'ooba':
    case 'petals': {
      return true
    }
  }

  return false
}

export function toLocalTime(date: string) {
  const d = new Date(date)
  const Y = d.getFullYear()
  const M = (d.getMonth() + 1).toString().padStart(2, '0')
  const D = d.getDate().toString().padStart(2, '0')

  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')

  return `${Y}-${M}-${D}T${h}:${m}`
}

export type FieldUpdater = (index: number, path: string) => (ev: any) => void

/**
 * init: Initial list of items
 * empty: Object template to use when adding a new item to the list
 * @param opts
 * @returns
 */
export function useRowHelper<T extends object>(opts: {
  signal: [() => T[], (v: T[]) => void]
  empty: T
}) {
  const items = opts.signal[0]
  const setItems = opts.signal[1]

  const add = () => {
    const next = items().concat(deepClone(opts.empty))
    setItems(next)
  }

  const remove = (index: number) => {
    const prev = items()
    const next = prev.slice(0, index).concat(prev.slice(index + 1))
    setItems(next)
  }

  const updateItem = (index: number, field: string, value: any) => {
    const prev = items()
    const item = setProperty(prev[index], field, value)

    const next = prev
      .slice(0, index)
      .concat(item)
      .concat(prev.slice(index + 1))
    setItems(next)
  }

  const updater = (index: number, field: string) => {
    return (ev: any) => {
      // Toggle, Radio, ColorPicker, ...
      if (typeof ev === 'string' || typeof ev === 'number' || typeof ev === 'boolean') {
        return updateItem(index, field, ev)
      }

      // Textarea and Input fields
      if ('currentTarget' in ev) {
        return updateItem(index, field, ev.currentTarget.value)
      }

      // Selects
      if ('label' in ev && 'value' in ev) {
        return updateItem(index, field, ev.value)
      }

      // MultiDropdown
      if (Array.isArray(ev)) {
        return updateItem(
          index,
          field,
          ev.map((ev) => ev.value)
        )
      }
    }
  }

  return { add, remove, updateItem, items, updater }
}

function setProperty(obj: any, path: string, value: any): any {
  const [head, ...rest] = path.split('.')

  return {
    ...obj,
    [head]: rest.length ? setProperty(obj[head], rest.join('.'), value) : value,
  }
}
