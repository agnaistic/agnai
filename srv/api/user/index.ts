import { Router } from 'express'
import { loggedIn } from '../auth'
import { changePassword, login, register } from './auth'
import { createUserPreset, getUserPresets, updateUserPreset } from './presets'
import {
  deleteHordeKey,
  deleteNovelKey,
  deleteOaiKey,
  getConfig,
  getProfile,
  updateConfig,
  updateProfile,
} from './settings'

const router = Router()

router.post('/login', login)
router.post('/register', register)

router.get('/', loggedIn, getProfile)
router.get('/config', loggedIn, getConfig)
router.delete('/config/horde', loggedIn, deleteHordeKey)
router.delete('/config/novel', loggedIn, deleteNovelKey)
router.delete('/config/openai', loggedIn, deleteOaiKey)
router.post('/password', loggedIn, changePassword)
router.post('/config', loggedIn, updateConfig)
router.post('/profile', loggedIn, updateProfile)
router.get('/presets', loggedIn, getUserPresets)
router.post('/presets', loggedIn, createUserPreset)
router.post('/presets/:id', loggedIn, updateUserPreset)

export default router
