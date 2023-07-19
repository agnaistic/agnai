import { Router } from 'express'
import { loggedIn } from '../auth'
import { changePassword, createApiKey, login, register, remoteLogin, verifyOauthKey } from './auth'
import { createUserPreset, getUserPresets, updateUserPreset, deleteUserPreset } from './presets'
import { hordeStats, novelLogin, openRouterModels, openaiUsage, updateService } from './services'
import {
  deleteHordeKey,
  deleteNovelKey,
  deleteOaiKey,
  deleteScaleKey,
  deleteClaudeKey,
  deleteThirdPartyPassword,
  getConfig,
  getInitialLoad,
  getProfile,
  updateConfig,
  updateProfile,
  deleteElevenLabsKey,
  updateUI,
  updatePartialConfig,
} from './settings'

const router = Router()

router.post('/login/callback', loggedIn, remoteLogin)
router.post('/login', login)
router.post('/register', register)
router.post('/services/openai-usage', openaiUsage)
router.post('/services/novel', novelLogin)
router.post('/services/horde-stats', hordeStats)
router.get('/services/openrouter', openRouterModels)
router.post('/code', loggedIn, createApiKey)
router.post('/verify', verifyOauthKey)
router.get('/init', loggedIn, getInitialLoad)
router.get('/', loggedIn, getProfile)
router.get('/presets', loggedIn, getUserPresets)
router.get('/config', loggedIn, getConfig)
router.get('/:id', loggedIn, getProfile)
router.post('/config/service/:service', loggedIn, updateService)
router.delete('/config/scale', loggedIn, deleteScaleKey)
router.delete('/config/horde', loggedIn, deleteHordeKey)
router.delete('/config/novel', loggedIn, deleteNovelKey)
router.delete('/config/openai', loggedIn, deleteOaiKey)
router.delete('/config/claude', loggedIn, deleteClaudeKey)
router.delete('/config/third-party', loggedIn, deleteThirdPartyPassword)
router.delete('/config/elevenlabs', loggedIn, deleteElevenLabsKey)
router.delete('/presets/:id', loggedIn, deleteUserPreset)
router.post('/password', loggedIn, changePassword)
router.post('/ui', loggedIn, updateUI)
router.post('/config/partial', loggedIn, updatePartialConfig)
router.post('/config', loggedIn, updateConfig)
router.post('/profile', loggedIn, updateProfile)
router.post('/presets', loggedIn, createUserPreset)
router.post('/presets/:id', loggedIn, updateUserPreset)

export default router
