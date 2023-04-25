import { Router } from 'express'
import { loggedIn } from '../auth'
import { changePassword, login, register } from './auth'
import { createUserPreset, getUserPresets, updateUserPreset, deleteUserPreset } from './presets'
import { openaiUsage } from './services'
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
} from './settings'

const router = Router()

router.post('/login', login)
router.post('/register', register)
router.post('/services/openai-usage', openaiUsage)
router.get('/init', loggedIn, getInitialLoad)
router.get('/', loggedIn, getProfile)
router.get('/presets', loggedIn, getUserPresets)
router.get('/config', loggedIn, getConfig)
router.get('/:id', loggedIn, getProfile)
router.delete('/config/scale', loggedIn, deleteScaleKey)
router.delete('/config/horde', loggedIn, deleteHordeKey)
router.delete('/config/novel', loggedIn, deleteNovelKey)
router.delete('/config/openai', loggedIn, deleteOaiKey)
router.delete('/config/claude', loggedIn, deleteClaudeKey)
router.delete('/config/third-party', loggedIn, deleteThirdPartyPassword)
router.delete('/presets/:id', loggedIn, deleteUserPreset)
router.post('/password', loggedIn, changePassword)
router.post('/config', loggedIn, updateConfig)
router.post('/profile', loggedIn, updateProfile)
router.post('/presets', loggedIn, createUserPreset)
router.post('/presets/:id', loggedIn, updateUserPreset)

export default router
