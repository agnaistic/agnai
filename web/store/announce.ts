import { api } from './api'
import { createStore } from './create'
import { subscribe } from './socket'
import { toastStore } from './toasts'
import { AppSchema } from '/common/types'

type AnnounceState = {
  list: AppSchema.Announcement[]
  admin: AppSchema.Announcement[]
  loading: boolean
  updated: Date
}

const initState: AnnounceState = {
  list: [],
  admin: [],
  loading: false,
  updated: new Date(),
}

export const announceStore = createStore<AnnounceState>(
  'announce',
  initState
)(() => {
  return {
    async getAll() {
      const res = await api.get('/announce')
      if (res.result) {
        return { list: res.result.announcements, updated: new Date() }
      }
    },
    async getAllAdmin() {
      const res = await api.get('/announce/admin')
      if (res.result) {
        return { admin: res.result.announcements }
      }

      if (res.error) {
        toastStore.error(`Failed to get announcements: ${res.error}`)
      }
    },
    async *update(
      { admin },
      id: string,
      update: Partial<AppSchema.Announcement>,
      onSuccess?: (announce: AppSchema.Announcement) => void
    ) {
      yield { loading: true }
      const res = await api.post(`/announce/${id}`, update)
      yield { loading: false }
      if (res.result) {
        const next = admin.map((a) => (a._id === id ? res.result : a))
        toastStore.success('Announcement updated')
        yield { admin: next }
        onSuccess?.(res.result)
      }
      if (res.error) {
        toastStore.error(`Failed to updated announcement: ${res.error}`)
      }
    },
    async *create(
      { admin },
      create: OmitId<AppSchema.Announcement, Dates>,
      onSuccess?: (announce: AppSchema.Announcement) => void
    ) {
      yield { loading: true }
      const res = await api.post(`/announce`, create)
      yield { loading: false }
      if (res.result) {
        yield { admin: [res.result].concat(admin) }
        toastStore.success('Annoucement created')
        onSuccess?.(res.result)
        return
      }
      if (res.error) {
        toastStore.error(`Failed to updated announcement: ${res.error}`)
      }
    },
  }
})

subscribe('announcement', { announcement: 'any' }, (body) => {
  const { list } = announceStore.getState()

  const next = list.concat(body.announcement)
  announceStore.setState({ list: next })

  if (body.announcement.location === 'notification') {
    toastStore.info(`New announcement! Check your notifications.`)
  } else {
    toastStore.info(`New announcement! Check the home page.`)
  }
})
