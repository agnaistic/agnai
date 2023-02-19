import { Router } from 'express'
import settings from './settings'
import chat from './chat'
import character from './character'

const router = Router()

router.use('/settings', settings)
router.use('/chat', chat)
router.use('/character', character)

export default router
