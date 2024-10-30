import { Express, Router } from 'express'
import chat from './chat'
import character from './character'
import classify from './classify'
import user from './user'
import admin from './admin'
import subscriptions from './subscriptions'
import horde from './horde'
import settings from './settings'
import memory from './memory'
import scenario from './scenario'
import selfhost from './json'
import voice from './voice'
import { config } from '../config'
import announcements from './announcements'
import { apiKeyUsage } from './auth'
import { generateImageApi, inferenceApi, inferenceModels } from './chat/inference'

const router = Router()

router.use('/user', user)
router.use('/chat', chat)
router.use('/character', character)
router.use('/classify', classify)
router.use('/admin', subscriptions)
router.use('/admin', admin)
router.use('/horde', horde)
router.use('/settings', settings)
router.use('/memory', memory)
router.use('/scenario', scenario)
router.use('/voice', voice)
router.use('/announce', announcements)

if (config.jsonStorage) {
  router.use('/json', selfhost)
}

export function keyed(app: Express) {
  app.post('/v1/completions', apiKeyUsage, inferenceApi)
  app.post('/v1/chat/completions', apiKeyUsage, inferenceApi)
  app.get('/v1/models', apiKeyUsage, inferenceModels)
  app.post('/v1/image', apiKeyUsage, generateImageApi)
  app.post('/v1/generate-image', apiKeyUsage, generateImageApi)
  app.get('/models', apiKeyUsage, inferenceModels)
  app.post('/completions', apiKeyUsage, inferenceApi)
  app.post('/chat/completions', apiKeyUsage, inferenceApi)
}

export default router
