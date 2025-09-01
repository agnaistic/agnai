import { JSX } from 'solid-js'
import { ButtonSchema } from '../shared/Button'
import { canUsePane, isMobile } from '../shared/hooks'
import { createStore } from './create'
import type { FileInputResult } from '../shared/FileInput'
import { defaultFlags, FeatureFlags } from './flags'

export type ConfirmAction = {
  schema?: ButtonSchema
  text: string | JSX.Element
  onClick: () => void
}

export type PageState = {
  showMenu: boolean
  showOverlay: boolean
  showImpersonate: boolean
  showSettings: boolean

  confirm?: {
    title?: string
    message: string | JSX.Element
    actions?: ConfirmAction[]
    onConfirm?: () => void
  }

  info?: {
    content: any
    title: string
  }

  attach?: {
    show: boolean
    multiple: boolean
    accept: string
    callback: (files: FileInputResult[]) => void
  }

  flags: FeatureFlags
}

const FLAG_KEY = 'agnai-flags'

export const pageStore = createStore<PageState>('page', {
  showMenu: isMobile() || location.search.includes('callback=') ? false : true,
  showOverlay: false,
  showImpersonate: false,
  showSettings: false,
  flags: getFlags(),
})((getter, setter) => {
  return {
    openAttach(
      {},
      opts: { multiple?: boolean; accept?: string },
      callback: (files: FileInputResult[]) => void
    ) {
      const wrapped = (files: FileInputResult[]) => {
        callback(files)
        setter({ attach: undefined })
      }

      return {
        attach: {
          show: true,
          multiple: !!opts.multiple,
          accept: opts.accept || '*/*',
          callback: wrapped,
        },
      }
    },

    info(_, title: string, content: JSX.Element | string) {
      return { info: { content, title } }
    },
    closeInfo() {
      return { info: undefined }
    },

    settings({ showSettings }, show?: boolean) {
      const next = show ?? !showSettings
      return { showSettings: next }
    },
    menu({ showMenu }, next?: boolean) {
      return { showMenu: next ?? !showMenu, overlay: next ?? !showMenu }
    },
    closeMenu: () => {
      if (canUsePane()) return
      return { showMenu: false, overlay: false }
    },
    toggleOverlay({ showOverlay }, next?: boolean) {
      return { showOverlay: next === undefined ? !showOverlay : next }
    },

    openConfirm(
      {},
      opts: {
        message: string | JSX.Element
        title?: string
        onConfirm?: () => void
        actions?: ConfirmAction[]
      }
    ) {
      return {
        confirm: {
          message: opts.message,
          title: opts.title,
          onConfirm: opts.onConfirm,
          actions: opts.actions,
        },
      }
    },
    closeConfirm({ confirm }, confirmed: boolean) {
      if (!confirm) return

      if (!confirmed) {
        return { confirm: undefined }
      }

      confirm.onConfirm?.()
      return { confirm: undefined }
    },
    toggleImpersonate: ({ showImpersonate }, show?: boolean) => {
      return { showImpersonate: show ?? !showImpersonate }
    },
    flag({ flags }, flag: keyof FeatureFlags, value: boolean) {
      const nextFlags = { ...flags, [flag]: value }
      window.flags = nextFlags
      saveFlags(nextFlags)
      return { flags: nextFlags }
    },
  }
})

window.flag = function (flag: keyof FeatureFlags, value) {
  if (!flag) {
    const state = pageStore((s) => s.flags)
    console.log('Available flags:')
    for (const [key] of Object.entries(defaultFlags)) console.log(key, (state as any)[key])
    return
  }

  if (value === undefined) {
    const { flags } = pageStore.getState()
    value = !flags[flag]
  }

  console.log(`Toggled ${flag} --> ${value}`)
  pageStore.flag(flag as any, value)
}

for (const key of Object.keys(defaultFlags)) {
  Object.defineProperty(window.flag, key, {
    get() {
      window.flag(key)
      return
    },
  })
}

Object.freeze(window.flag)

type FlagCache = { user: FeatureFlags; default: FeatureFlags }

function getFlags(): FeatureFlags {
  try {
    const cache = localStorage.getItem(FLAG_KEY)
    if (!cache) {
      saveFlags(defaultFlags)
      return defaultFlags
    }

    const parsed = JSON.parse(cache) as FlagCache

    const flags: any = parsed.user
    const pastDefaults: any = parsed.default

    for (const [key, value] of Object.entries(defaultFlags)) {
      // If the user does not have the key, set it no matter what
      if (key in flags === false) {
        flags[key] = value
        continue
      }

      // If the 'default' value for the flag has changed, change it for the user
      const prev = pastDefaults[key]
      if (prev !== value) {
        flags[key] = value
        continue
      }
    }

    saveFlags(flags)
    return flags
  } catch (ex) {
    saveFlags(defaultFlags)
    return defaultFlags
  }
}

function saveFlags(flags: {}) {
  try {
    window.flags = flags
    const cache: FlagCache = { user: flags as any, default: defaultFlags }
    localStorage.setItem(FLAG_KEY, JSON.stringify(cache))
  } catch (ex) {}
}
