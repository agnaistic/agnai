import { Router } from 'express'
import chat from './chat'
import character from './character'
import classify from './classify'
import { authMiddleware } from './auth'
import user from './user'

const router = Router()

router.use(authMiddleware)
router.use('/user', user)
router.use('/chat', chat)
router.use('/character', character)
router.use('/classify', classify)

export default router
