import { Router } from 'express'
import { loggedIn } from '../auth'
import { createChat, generateMessage } from './create'
import { retryMessage, updateChat, updateMessage } from './edit'
import { getCharacterChats, getChatDetail } from './get'
import { deleteMessages } from './remove'

const router = Router()

router.use(loggedIn)
router.post('/', createChat)
router.get('/:id', getChatDetail)
router.put('/:id', updateChat)

router.get('/:id/chats', getCharacterChats)

router.post('/:id/retry/:messageId', retryMessage)
router.post('/:id/message', generateMessage)
router.put('/:id/message', updateMessage)
router.delete('/messages', deleteMessages)

export default router
