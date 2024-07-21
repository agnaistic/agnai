import { AppSchema } from '../../common/types/schema'
import { EVENTS, events } from '../emitter'
import { api, isLoggedIn } from './api'
import { createStore } from './create'
import { subscribe } from './socket'
import { toastStore } from './toasts'

type InviteState = {
  invites: AppSchema.ChatInvite[]
  chars: Record<string, AppSchema.Character>
  profiles: Record<string, AppSchema.Profile>
  chats: AppSchema.Chat[]
}

const initState: InviteState = {
  invites: [],
  chars: {},
  profiles: {},
  chats: [],
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
      if (!isLoggedIn()) return

      const res = await api.get<{
        invites: AppSchema.ChatInvite[]
        chars: AppSchema.Character[]
        chats: AppSchema.Chat[]
        profiles: AppSchema.Profile[]
      }>('/chat/invites')
      if (res.error) return toastStore.error('Failed to retrieve invites')
      if (res.result) {
        return {
          invites: res.result.invites,
          chars: res.result.chars.reduce(
            (prev, curr) => Object.assign(prev, { [curr._id]: curr }),
            {}
          ),
          profiles: res.result.profiles.reduce(
            (prev, curr) => Object.assign(prev, { [curr.userId]: curr }),
            {}
          ),
          chats: res.result.chats,
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
    async *accept({ invites }, inviteId: string, onSuccess?: Function) {
      const res = await api.post(`/chat/${inviteId}/accept`)
      if (res.error) return toastStore.error(`Failed to accept invite: ${res.error}`)
      if (res.result) {
        toastStore.success(`Invitation accepted`)
        yield { invites: invites.filter((inv) => inv._id !== inviteId) }
        onSuccess?.()
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
