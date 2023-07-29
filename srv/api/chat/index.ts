import { Router } from 'express'
import { loggedIn } from '../auth'
import { createChat, importChat } from './create'
import {
  restartChat,
  updateChat,
  updateChatGenPreset,
  updateChatGenSettings,
  updateMessage,
  updateMessageProps,
} from './edit'
import { getAllChats, getCharacterChats, getChatDetail } from './get'
import { guestGenerateMsg } from './guest-msg'
import { createImage } from './image'
import { createInvite, acceptInvite, rejectInvite, getInvites, uninviteMember } from './invite'
import { generateMessageV2, getMessages, createMessage } from './message'
import { deleteChat, deleteMessages } from './remove'
import { textToSpeech } from './texttospeech'
import { addCharacter, upsertTempCharacter, removeCharacter } from './characters'
import { generateActions, guidance, inference, rerunGuidance } from './inference'

const router = Router()

router.post('/inference', inference)
router.post('/guidance', guidance)
router.post('/reguidance', rerunGuidance)
router.post('/:id/actions', generateActions)
router.post('/:id/send', createMessage)
router.post('/:id/generate', generateMessageV2)
router.post('/:id/guest-message', guestGenerateMsg)
router.post('/:id/image', createImage)
router.post('/:id/voice', textToSpeech)
router.use(loggedIn)
router.get('/', getAllChats)
router.post('/:id/restart', restartChat)
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
router.post('/:id/temp-character', upsertTempCharacter)
router.delete('/:id/characters/:charId', removeCharacter)

router.get('/:id/chats', getCharacterChats)

router.put('/:id/message', updateMessage)
router.put('/:id/message-props', updateMessageProps)
router.delete('/:id/messages', deleteMessages)
router.delete('/:id', deleteChat)

export default router
