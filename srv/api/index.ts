import { Router } from 'express'
import chat from './chat'
import character from './character'
import classify from './classify'
import { authMiddleware } from './auth'
import user from './user'
import admin from './admin'
import horde from './horde'
import settings from './settings'
import memory from './memory'
import selfhost from './json'
import { config } from '../config'

const router = Router()

router.use(authMiddleware)
router.use('/user', user)
router.use('/chat', chat)
router.use('/character', character)
router.use('/classify', classify)
router.use('/admin', admin)
router.use('/horde', horde)
router.use('/settings', settings)
router.use('/memory', memory)

if (config.jsonStorage) {
  router.use('/json', selfhost)
}

export default router
