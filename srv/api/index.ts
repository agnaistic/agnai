import { Router } from 'express'
import settings from './settings'
import chat from './chat'
import character from './character'
import classify from './classify'

const router = Router()

router.use('/settings', settings)
router.use('/chat', chat)
router.use('/character', character)
router.use('/classify', classify)

export default router
