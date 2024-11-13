import { createHooks, recommended } from '@css-hooks/solid'
import * as lf from 'localforage'
import { UnwrapBody, Validator, assertValid } from '/common/valid'
import { AIAdapter, PresetAISettings, ThirdPartyFormat } from '/common/adapters'
import type { Option } from './Select'
import { Component, createEffect, JSX, onCleanup } from 'solid-js'
import type { UserState } from '../store'
import { AppSchema, UI } from '/common/types'
import { deepClone } from '/common/util'
import { getRootRgb } from './colors'
import { getStore } from '../store/create'
import { ADAPTER_SETTINGS } from './PresetSettings/settings'
import { PresetState } from './PresetSettings/types'

const [css, hooks] = createHooks(recommended)

export { hooks, css }

export type ExtractProps<TComponent> = TComponent extends Component<infer TProps>
  ? TProps
  : TComponent

type ChanceArg<T extends keyof Chance.Chance> = Chance.Chance[T] extends (arg: infer U) => any
  ? U
  : never

export async function random<T extends keyof Chance.Chance>(kind: T, opts: ChanceArg<T>) {
  const Chance = await import('chance').then((mod) => new mod.Chance())

  const func: any = Chance[kind]
  if (typeof func === 'function') {
    return func.call(Chance, opts)
  }

  return ''
}

export type ComponentEmitter<T extends string> = {
  emit: { [key in T]: () => void }
  on: ComponentSubscriber<T>
}

export type ComponentSubscriber<T> = (event: T, callback: () => any) => void

export function createEmitter<T extends string>(...events: T[]) {
  let emit: any = {}
  const listeners: Array<{ event: T; callback: () => void }> = []

  const on = (event: T, callback: () => void) => {
    listeners.push({ event, callback })
  }

  for (const event of events) {
    emit[event] = () => {
      for (const cb of listeners) {
        if (cb.event === event) cb.callback()
      }
    }
  }

  onCleanup(() => {
    listeners.length = 0
    emit = undefined
  })

  return { emit, on } as ComponentEmitter<T>
}

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

export function getHeaderBg(mode: UI.UISettings['mode']) {
  mode
  const rgb = getRootRgb('bg-900')
  const styles: JSX.CSSProperties = {
    background: rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)` : 'bg-900',
  }
  return styles
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

const DEFAULT_PREFIXES: Record<string, string> = {
  'agnai.chat': 'https://agnai-assets.sgp1.digitaloceanspaces.com',
  'dev.agnai.chat': 'https://agnai-assets.sgp1.digitaloceanspaces.com',
}

const PREFIX_CACHE_KEY = 'agnai-asset-prefix'

let assetPrefix: string =
  localStorage.getItem(PREFIX_CACHE_KEY) || DEFAULT_PREFIXES[location.hostname.toLowerCase()] || ''

export function getAssetPrefix() {
  return assetPrefix
}

export function isBase64(file: string) {
  if (file.startsWith('/') || file.startsWith('http')) return false
  if (file.startsWith('data:')) return true

  return file.length > 500
}

export function getAssetUrl(filename: string) {
  if (filename.startsWith('http:') || filename.startsWith('https:') || filename.startsWith('data:'))
    return filename

  // Likely base64
  if (filename.length > 500) return filename

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
  if (!prefix && assetPrefix) return
  // if (!prefix.startsWith('http')) {
  //   prefix = `https://${prefix}`
  // }

  storage.localSetItem(PREFIX_CACHE_KEY, prefix)
  assetPrefix = prefix
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

export function formatDate(value: string | number | Date) {
  const date = new Date(value)
  const str = date.toString()
  const day = date.getDate()
  const month = str.slice(4, 7)
  const time = str.slice(16, 24)

  return `${month} ${day} ${time}`
}

export function toShortDuration(valueSecs: number | Date | string, parts?: number) {
  if (valueSecs instanceof Date) {
    valueSecs = Math.round((Date.now() - valueSecs.valueOf()) / 1000)
  } else if (typeof valueSecs === 'string') {
    valueSecs = Math.round((Date.now() - new Date(valueSecs).valueOf()) / 1000)
  }

  if (valueSecs < 60) {
    return '<1m'
  }
  const {
    duration: [days, hours, minutes, seconds],
  } = toRawDuration(valueSecs)

  if (parts) {
    const sects: string[] = []
    if (days) sects.push(`${days}d`)
    if (hours) sects.push(`${hours}h`)
    if (minutes) sects.push(`${minutes}m`)
    if (seconds) sects.push(`${seconds}s`)

    return sects.slice(0, parts).join(' ')
  }

  if (days) {
    return `${days}d`
  }

  if (hours) {
    return `${hours}h`
  }

  if (minutes) {
    return `${minutes}m`
  }

  return `${seconds}s`
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

export function toEntityMap<T extends { _id: string }>(list: T[]): Record<string, T> {
  const map = list.reduce((prev, curr) => {
    prev[curr._id] = curr
    return prev
  }, {} as Record<string, T>)

  return map
}

export function uniqueBy<T>(list: T[], key: keyof T) {
  const set = new Set<any>()
  const next: T[] = []

  for (const item of list) {
    if (!set.has(item[key])) {
      next.push(item)
      set.add(item[key])
    }
  }

  return next
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
  state: Pick<PresetState, 'service' | 'thirdPartyFormat'>,
  ...props: Array<keyof PresetAISettings>
) {
  if (!state.service) {
    return true
  }

  for (const prop of props) {
    if (isValidServiceSetting(state, prop)) {
      return true
    }
  }

  return false
}

export function getAISettingServices(prop?: keyof AppSchema.GenSettings) {
  if (!prop) return
  const cfg = getStore('settings')((s) => s.config)
  if (!isPresetSetting(prop)) return

  const base = ADAPTER_SETTINGS[prop]
  const names: Array<AIAdapter | ThirdPartyFormat> = []
  for (const reg of cfg.registered) {
    if (reg.options.includes(prop)) names.push(reg.name)
  }

  return base?.concat(names)
}

function isPresetSetting(key: string): key is keyof PresetAISettings {
  return key in ADAPTER_SETTINGS === true
}

export function isValidServiceSetting(
  state: Pick<PresetState, 'service' | 'thirdPartyFormat'>,
  prop?: keyof PresetAISettings
) {
  const services = getAISettingServices(prop)
  // Setting does not declare itself as a service setting
  if (!services || !state.service) return true

  if (services.includes(state.service)) return true
  if (!state.thirdPartyFormat) {
    return false
  }

  if (state.service !== 'kobold') {
    return false
  }

  for (const srv of services) {
    if (srv === state.thirdPartyFormat) return true
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

export function applyStoreProperty<T>(obj: T, property: string, value: any) {
  const props = property.split('.')

  let base: any = JSON.parse(JSON.stringify(obj || {}))
  let ref: any = base

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

  return base
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
  const { user } = getStore('user').getState()
  const { config } = getStore('settings').getState()

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
      const level = user?.admin ? Infinity : user?.sub?.level ?? -1
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

    case 'venus': {
      return !!user?.adapterConfig?.venus?.apiKeySet
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
  empty: () => T
}) {
  const items = opts.signal[0]
  const setItems = opts.signal[1]

  const add = () => {
    const next = items().concat(deepClone(opts.empty()))
    setItems(next)
  }

  const remove = (index: number) => {
    const prev = items()
    const next = prev.slice(0, index).concat(prev.slice(index + 1))
    setItems(next)
  }

  const updateItem = (index: number, field: string, value: any) => {
    const prev = items()
    const base = getProperty(opts.empty(), field)
    const parsed = typeof base === 'number' ? +value : value
    const item = setProperty(prev[index], field, parsed)

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

function getProperty(obj: any, path: string) {
  const [head, ...props] = path.split('.')

  let curr = obj[head]
  if (curr === undefined) return

  for (const prop of props) {
    if (curr === undefined) return
    curr = curr[prop]
  }

  return curr
}

export const sticky = {
  interval: null as any as NodeJS.Timer,
  monitor: (ref: HTMLElement) => {
    let bottom = true

    ref.onscroll = (ev) => {
      const pos = ref.scrollTop

      if (pos >= 0) {
        bottom = true
      } else {
        bottom = false
      }
    }

    sticky.interval = setInterval(() => {
      if (bottom && ref.scrollTop !== 0) {
        ref.scrollTop = 0
      }
    }, 1000 / 30)
  },
  clear: () => clearInterval(sticky.interval),
}
