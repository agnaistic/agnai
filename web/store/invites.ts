import { AppSchema } from '../../srv/db/schema'
import { EVENTS, events } from '../emitter'
import { api } from './api'
import { createStore } from './create'
import { subscribe } from './socket'
import { toastStore } from './toasts'

type InviteState = {
  invites: AppSchema.ChatInvite[]
  chars: Record<string, AppSchema.Character>
  profiles: Record<string, AppSchema.Profile>
  chats: Record<string, AppSchema.Chat>
}

const initState: InviteState = {
  invites: [],
  chars: {},
  profiles: {},
  chats: {},
}

export const inviteStore = createStore<InviteState>(
  'invite',
  initState
)((_) => {
  events.on(EVENTS.loggedOut, () => {
    inviteStore.setState(initState)
  })

  return {
    async getInvites() {
      const res = await api.get('/chat/invites')
      if (res.error) return toastStore.error('Failed to retrieve invites')
      if (res.result) {
        return {
          invites: res.result.invites,
          chars: res.result.chars,
          chats: res.result.chats,
          profiles: res.result.profiles,
        }
      }
    },
    async create(_, chatId: string, userId: string) {
      const res = await api.post(`/chat/${chatId}/invite`, { userId })
      if (res.error) return toastStore.error(`Failed to invite user: ${res.error}`)
      if (res.result) {
        toastStore.success(`Successfully invited user to conversation`)
      }
    },
    async accept({ invites }, inviteId: string) {
      const res = await api.post(`/chat/${inviteId}/accept`)
      if (res.error) return toastStore.error(`Failed to accept invite: ${res.error}`)
      if (res.result) {
        toastStore.success(`Invitation accepted`)
        return { invites: invites.filter((inv) => inv._id !== inviteId) }
      }
    },
    async reject({ invites }, inviteId: string) {
      const res = await api.post(`/chat/${inviteId}/reject`)
      if (res.error) return toastStore.error(`Failed to accept invite: ${res.error}`)
      if (res.result) {
        toastStore.normal(`Invitation rejected`)
        return { invites: invites.filter((inv) => inv._id !== inviteId) }
      }
    },
  }
})

subscribe('invite-created', { invite: 'any' }, () => {
  inviteStore.getInvites()
})
