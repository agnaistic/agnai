import { Router } from 'express'
import settings from './settings'
import chat from './chat'

const router = Router()

router.use('/settings', settings)
router.use('/chat', chat)

export default router
