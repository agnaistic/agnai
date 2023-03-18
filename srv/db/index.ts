import * as chats from './chats'
import * as characters from './characters'
import * as users from './user'
import * as invites from './invite'
import * as admin from './admin'
import * as presets from './presets'
import * as msgs from './messages'

export { db } from './client'

export const store = {
  chats,
  characters,
  users,
  invites,
  admin,
  presets,
  msgs,
}
