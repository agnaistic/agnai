import { createStore, getStore } from './create'
import { subscribe } from './socket'
import { setNotifier } from '/common/requests/util'

export type Toast = {
  id: number
  message: string
  type: 'default' | 'warn' | 'success' | 'error' | 'admin'
  ttl: number
}

let toastId = 0

type ToastState = {
  toasts: Toast[]
  history: Array<{ time: Date; toast: Toast; seen: boolean }>
  unseen: number
  modal: boolean
}

export const toastStore = createStore<ToastState>('toasts', {
  toasts: [],
  history: [],
  unseen: 0,
  modal: false,
})((get, set) => {
  const addToast = (kind: Toast['type']) => {
    return (_: ToastState, msg: string, ttl = 5) => {
      if (kind === 'admin') {
        ttl = 300
      }

      const id = ++toastId
      const toast: Toast = {
        id,
        type: kind,
        message: msg,
        ttl,
      }

      setTimeout(() => {
        const { toasts } = get()
        set({ toasts: toasts.filter((t) => t.id !== id) })
      }, ttl * 1000)

      const { toasts, history } = get()

      const nextHistory =
        getLevel(toast.type) > 2
          ? [{ time: new Date(), toast, seen: false }].concat(history)
          : history

      const unseen = nextHistory.filter((nh) => !nh.seen).length
      return { toasts: toasts.concat(toast), history: nextHistory, unseen }
    }
  }

  const adminToast = addToast('admin')

  return {
    modal({ history }, state: boolean) {
      if (state) {
        return {
          modal: true,
          history: history.map((h) => ({ ...h, seen: true })),
          unseen: 0,
        }
      }

      return { modal: false }
    },
    clearHistory(prev, id?: number) {
      if (id) {
        return { history: prev.history.filter((h) => h.toast.id !== id) }
      }

      return { history: [] }
    },
    remove: ({ toasts }, id: number) => {
      return { toasts: toasts.filter((t) => t.id !== id) }
    },
    info: addToast('default'),
    normal: addToast('default'),
    warn: addToast('warn'),
    success: addToast('success'),
    error: addToast('error'),
    admin: (_, message: string, level?: number) => {
      if (level === undefined) {
        adminToast(_, message)
        return
      }
      const user = getStore('user').getState()
      const userLevel = user.user?.admin ? Infinity : user.userLevel

      if (userLevel >= level) {
        return adminToast(_, message)
      }
    },
  }
})

setNotifier(toastStore)

subscribe('notification', { level: 'string?', message: 'string', ttl: 'number?' }, (body) => {
  switch (body.level) {
    case 'error':
      return toastStore.error(body.message, body.ttl)

    case 'warn':
    case 'warning':
      return toastStore.warn(body.message, body.ttl)

    case 'normal':
    default:
      return toastStore.normal(body.message, body.ttl)
  }
})

function getLevel(type: Toast['type']) {
  switch (type) {
    case 'default':
      return 1
    case 'success':
      return 2
    case 'warn':
      return 3
    case 'error':
      return 4
    case 'admin':
      return 5
  }
}

subscribe('admin-notification', { message: 'string', level: 'number?' }, (body) => {
  toastStore.admin(body.message, body.level)
})
