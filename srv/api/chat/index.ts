import { Router } from 'express'
import { loggedIn } from '../auth'
import { createChat } from './create'
import { updateChat, updateMessage } from './edit'

import { getAllChats, getCharacterChats, getChatDetail } from './get'
import { createInvite, acceptInvite, rejectInvite, getInvites } from './invite'
import { generateMessage, retryMessage } from './message'
import { deleteChat, deleteMessages } from './remove'

const router = Router()

router.use(loggedIn)
router.get('/', getAllChats)
router.get('/invites', getInvites)
router.post('/', createChat)
router.get('/:id', getChatDetail)
router.put('/:id', updateChat)

router.post('/:id/invite', createInvite)
router.post('/:inviteId/accept', acceptInvite)
router.post('/:inviteId/reject', rejectInvite)

router.get('/:id/chats', getCharacterChats)

router.post('/:id/retry/:messageId', retryMessage)
router.post('/:id/message', generateMessage)
router.put('/:id/message', updateMessage)
router.delete('/:id/messages', deleteMessages)
router.delete('/:id', deleteChat)

export default router
