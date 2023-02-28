import * as chats from './chats'
import * as characters from './characters'
import * as users from './user'
import * as invites from './invite'

export { db } from './client'

export const store = {
  chats,
  characters,
  users,
  invites,
}
