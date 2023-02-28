import { Router } from 'express'
import { loggedIn } from '../auth'
import { handle } from '../wrap'

const router = Router()
router.use(loggedIn)

const createInvite = handle(async (req) => {})

router.post('/')

export default router
