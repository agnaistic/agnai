import { Router } from 'express'
import chat from './chat'
import character from './character'
import classify from './classify'
import { authMiddleware } from './auth'
import { authApiKeyMiddleware } from './auth-api-key'
import user from './user'
import apiKeys from './api-keys'
import admin from './admin'
import horde from './horde'
import settings from './settings'
import memory from './memory'
import selfhost from './json'
import voice from './voice'
import { config } from '../config'

const router = Router()

router.use(authMiddleware)
router.use(authApiKeyMiddleware)
router.use('/user', user)
router.use('/apiKeys', apiKeys)
router.use('/chat', chat)
router.use('/character', character)
router.use('/classify', classify)
router.use('/admin', admin)
router.use('/horde', horde)
router.use('/settings', settings)
router.use('/memory', memory)
router.use('/voice', voice)

if (config.jsonStorage) {
  router.use('/json', selfhost)
}

export default router
