import { api } from './api'
import { createStore, getStore } from './create'
import { subscribe } from './socket'
import { toastStore } from './toasts'
import { AppSchema } from '/common/types'

type AnnounceState = {
  list: AppSchema.Announcement[]
  admin: AppSchema.Announcement[]
  filtered: AppSchema.Announcement[]
  loading: boolean
  updated: Date
  userLevel: number
}

const initState: AnnounceState = {
  list: [],
  filtered: [],
  admin: [],
  loading: false,
  updated: new Date(),
  userLevel: -1,
}

export const announceStore = createStore<AnnounceState>(
  'announce',
  initState
)((get, set) => {
  getStore('user').subscribe((userState) => {
    const level = userState.user?.admin ? Infinity : userState.userLevel
    const list = get().list
    set({
      userLevel: level,
      filtered: list.filter((l) => (l.userLevel !== undefined ? level >= l.userLevel : true)),
    })
  })

  return {
    async getAll({ userLevel }) {
      const res = await api.get('/announce')
      if (res.result) {
        const list: AppSchema.Announcement[] = res.result.announcements
        return {
          list,
          filtered: list.filter((l) =>
            l.userLevel !== undefined ? userLevel >= l.userLevel : true
          ),
          updated: new Date(),
        }
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
  const { userLevel } = getStore('user').getState()

  const next = list
    .filter((l) => l._id !== body.announcement._id)
    .concat(body.announcement)
    .sort(sortByShowAt)
  announceStore.setState({ list: next })

  const level: number = body.announcement.userLevel ?? -1

  if (level > userLevel) return

  if (body.announcement.location === 'notification') {
    toastStore.info(`New announcement! Check your notifications.`)
  } else {
    toastStore.info(`New announcement! Check the home page.`)
  }
})

subscribe('announcement-updated', { announcement: 'any' }, (body) => {
  const { list } = announceStore.getState()

  const next = list
    .filter((l) => l._id !== body.announcement._id)
    .concat(body.announcement)
    .sort(sortByShowAt)
  announceStore.setState({ list: next })
})

function sortByShowAt(l: AppSchema.Announcement, r: AppSchema.Announcement) {
  return r.showAt.localeCompare(l.showAt)
}
