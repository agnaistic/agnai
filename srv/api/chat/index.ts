import { Router } from 'express'
import { loggedIn } from '../auth'
import { createChat, importChat } from './create'
import { updateChat, updateChatGenPreset, updateChatGenSettings, updateMessage } from './edit'
import { getAllChats, getCharacterChats, getChatDetail } from './get'
import { guestGenerateMsg } from './guest-msg'
import { createImage } from './image'
import { createInvite, acceptInvite, rejectInvite, getInvites, uninviteMember } from './invite'
import { generateMessageV2, getMessages } from './message'
import { deleteChat, deleteMessages } from './remove'
import { textToSpeech } from './texttospeech'
import { addCharacter, removeCharacter } from './characters'

const router = Router()

router.post('/:id/generate', generateMessageV2)
router.post('/:id/guest-message', guestGenerateMsg)
router.post('/:id/image', createImage)
router.post('/:id/voice', textToSpeech)
router.use(loggedIn)
router.get('/', getAllChats)
router.get('/invites', getInvites)
router.get('/:id/messages', getMessages)
router.get('/:id', getChatDetail)

router.put('/:id', updateChat)
router.put('/:id/generation', updateChatGenSettings)
router.put('/:id/preset', updateChatGenPreset)

router.post('/', createChat)
router.post('/import', importChat)
router.post('/:id/invite', createInvite)
router.post('/:id/uninvite', uninviteMember)
router.post('/:inviteId/accept', acceptInvite)
router.post('/:inviteId/reject', rejectInvite)
router.post('/:id/characters', addCharacter)
router.delete('/:id/characters/:charId', removeCharacter)

router.get('/:id/chats', getCharacterChats)

router.put('/:id/message', updateMessage)
router.delete('/:id/messages', deleteMessages)
router.delete('/:id', deleteChat)

export default router
