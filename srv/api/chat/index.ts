import { Router } from 'express'
import { loggedIn } from '../auth'
import { createChat } from './create'
import { updateChat, updateChatGenPreset, updateChatGenSettings, updateMessage } from './edit'

import { getAllChats, getCharacterChats, getChatDetail } from './get'
import { guestGenerateMsg } from './guest-msg'
import { createImage } from './image'
import { createInvite, acceptInvite, rejectInvite, getInvites } from './invite'
import { generateMessage, getMessages, retryMessage, summarizeChat } from './message'
import { deleteChat, deleteMessages } from './remove'

const router = Router()

router.post('/:id/guest-message', guestGenerateMsg)
router.use(loggedIn)
router.get('/', getAllChats)
router.get('/invites', getInvites)
router.get('/:id/summary', summarizeChat)
router.get('/:id/messages', getMessages)
router.post('/', createChat)
router.get('/:id', getChatDetail)
router.put('/:id', updateChat)
router.put('/:id/generation', updateChatGenSettings)
router.put('/:id/preset', updateChatGenPreset)

router.post('/:id/invite', createInvite)
router.post('/:inviteId/accept', acceptInvite)
router.post('/:inviteId/reject', rejectInvite)

router.get('/:id/chats', getCharacterChats)

router.post('/:id/retry/:messageId', retryMessage)
router.post('/:id/message', generateMessage)
router.put('/:id/message', updateMessage)
router.delete('/:id/messages', deleteMessages)
router.delete('/:id', deleteChat)

router.post('/:id/image', createImage)

export default router
