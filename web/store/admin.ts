import Stripe from 'stripe'
import { AppSchema } from '../../common/types/schema'
import { EVENTS, events } from '../emitter'
import { api } from './api'
import { createStore } from './create'
import { toastStore } from './toasts'
import type { SubsAgg } from '/srv/domains/subs/types'

type UserInfo = {
  userId: string
  chats: number
  characters: number
  handle: string
  avatar: string
  state: SubsAgg
  username: string
  sub: AppSchema.User['sub']
  billing: AppSchema.User['billing']
}

type AdminState = {
  users: AppSchema.User[]
  info?: UserInfo
  metrics?: {
    totalUsers: number
    connected: number
    maxLiveCount: number
    each: Array<{ count: number; date: string; hostname: string; max: number }>
  }
  products: Stripe.Product[]
  prices: Stripe.Price[]
}

export const adminStore = createStore<AdminState>('admin', { users: [], products: [], prices: [] })(
  (_) => {
    return {
      async getUsers(
        _,
        opts: { username: string; subscribed: boolean; customerId: string },
        page = 0
      ) {
        const res = await api.post<{ users: AppSchema.User[] }>('/admin/users', { ...opts, page })
        if (res.error) return toastStore.error(`Unable to retrieve users: ${res.error}`)
        if (res.result) {
          return { users: res.result.users }
        }
      },
      async setPassword(_, userId: string, password: string, onSuccess?: Function) {
        const res = await api.post('/admin/user/password', { userId, password })
        if (res.error) return toastStore.error(`Failed to update user: ${res.error}`)
        if (res.result) toastStore.success(`Update user settings`)
        onSuccess?.()
      },
      async getInfo(_, userId: string) {
        const res = await api.get<UserInfo>(`/admin/users/${userId}/info`)
        if (res.error) toastStore.error(`Failed to get user info: ${res.error}`)
        if (res.result) return { info: res.result }
      },
      async getMetrics() {
        const res = await api.get('/admin/metrics')
        if (res.result) {
          return { metrics: res.result }
        }
      },
      async sendAll(_, message: string, onSuccess?: Function) {
        const res = await api.post(`/admin/notify`, { message })

        if (!res.error) {
          onSuccess?.()
        } else {
          toastStore.error(`Failed to send: ${res.error}`)
        }
      },
      async changeUserTier(_, userId: string, tierId: string) {
        const res = await api.post(`/admin/users/${userId}/tier`, { tierId })
        if (res.error) toastStore.error(`Failed to update user: ${res.error}`)
        if (res.result) toastStore.success(`User updated`)
      },
      async createTier(
        _,
        create: OmitId<AppSchema.SubscriptionTier, Dates>,
        onSuccess?: (res: AppSchema.SubscriptionTier) => void
      ) {
        const res = await api.post(`/admin/tiers`, create)
        if (res.result) {
          toastStore.success('Tier created')
          onSuccess?.(res.result)
          events.emit(EVENTS.tierReceived, res.result)
        }

        if (res.error) {
          toastStore.error(`Failed to create tier: ${res.error}`)
        }
      },
      async updateTier(_, id: string, update: Partial<OmitId<AppSchema.SubscriptionTier, Dates>>) {
        const res = await api.post(`/admin/tiers/${id}`, update)
        if (res.result) {
          toastStore.success('Tier updated')
          events.emit(EVENTS.tierReceived, res.result)
        }

        if (res.error) {
          toastStore.error(`Failed to update tier: ${res.error}`)
        }
      },
      async *getProducts() {
        yield { products: [], prices: [] }
        const res = await api.get('/admin/billing/products')
        if (res.result) {
          yield { products: res.result.products, prices: res.result.prices }
        }

        if (res.error) {
          toastStore.error(`Failed to retrieve products: ${res.error}`)
        }
      },
    }
  }
)
