import { createStore } from './create'
import { subscribe } from './socket'

export type Toast = {
  id: number
  message: string
  type: 'default' | 'warn' | 'success' | 'error'
  ttl: number
}

let toastId = 0

type ToastState = {
  toasts: Toast[]
}

export const toastStore = createStore<ToastState>('toasts', { toasts: [] })((get, set) => {
  const addToast = (kind: Toast['type']) => {
    return (_: ToastState, msg: string, ttl = 5) => {
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

      const { toasts } = get()
      return { toasts: toasts.concat(toast) }
    }
  }

  return {
    remove: ({ toasts }, id: number) => {
      return { toasts: toasts.filter((t) => t.id !== id) }
    },
    normal: addToast('default'),
    warn: addToast('warn'),
    success: addToast('success'),
    error: addToast('error'),
  }
})

subscribe('notification', { level: 'string?', message: 'string' }, (body) => {
  switch (body.level) {
    case 'error':
      return toastStore.error(body.message)

    case 'warn':
    case 'warning':
      return toastStore.warn(body.message)

    case 'normal':
    default:
      return toastStore.normal(body.message)
  }
})
