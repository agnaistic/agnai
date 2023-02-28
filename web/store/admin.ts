import { AppSchema } from '../../srv/db/schema'
import { api } from './api'
import { createStore } from './create'
import { toastStore } from './toasts'

type AdminState = {
  users: AppSchema.User[]
}

export const adminStore = createStore<AdminState>('admin', { users: [] })((_) => {
  return {
    async getUsers() {
      const res = await api.get<{ users: AppSchema.User[] }>('/admin/users')
      if (res.error) return toastStore.error(`Unable to retrieve users: ${res.error}`)
      if (res.result) {
        return { users: res.result.users }
      }
    },
    async setPassword(_, username: string, password: string, onSuccess?: Function) {
      const res = await api.post('/admin/user/password', { username, password })
      if (res.error) return toastStore.error(`Failed to update user: ${res.error}`)
      if (res.result) toastStore.success(`Update user settings`)
      onSuccess?.()
    },
  }
})
