import { Router } from 'express'
import { loggedIn } from '../auth'
import {
  changePassword,
  createApiKey,
  linkGoogleAccount,
  login,
  oathGoogleLogin,
  register,
  remoteLogin,
  resetPassword,
  resyncPatreon,
  unlinkGoogleAccount,
  unlinkPatreon,
  verifyOauthKey,
  verifyPatreonOauth,
} from './auth'
import {
  createUserPreset,
  getUserPresets,
  updateUserPreset,
  deleteUserPreset,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getPromptTemplates,
  deleteUserPresetKey,
  getThirdPartyPresetModels,
  testConnectionUrl,
} from './presets'
import { hordeStats, novelLogin, openRouterModels, updateService } from './services'
import {
  deleteHordeKey,
  deleteNovelKey,
  deleteOaiKey,
  deleteMistralKey,
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
  revealApiKey,
  generateApiKey,
  removeProfileAvatar,
  deleteFeatherlessKey,
  saveProvider,
  deleteProvider,
  removeProviderKey,
} from './settings'
import { deleteUserAccount } from './delete-user'

const router = Router()

router.post('/login/callback', loggedIn, remoteLogin)
router.post('/login/google', oathGoogleLogin)
router.post('/link-google', loggedIn, linkGoogleAccount)
router.post('/unlink-google', loggedIn, unlinkGoogleAccount)
router.post('/login', login)
router.post('/reset-password', resetPassword)
router.post('/register', register)
router.post('/provider', loggedIn, saveProvider)
router.delete('/provider-key', loggedIn, removeProviderKey)
router.delete('/provider', loggedIn, deleteProvider)
router.post('/services/novel', novelLogin)
router.post('/services/horde-stats', hordeStats)
router.get('/services/openrouter', openRouterModels)
router.post('/code', loggedIn, createApiKey)
router.post('/resync/patreon', loggedIn, resyncPatreon)
router.post('/verify/patreon', loggedIn, verifyPatreonOauth)
router.post('/unverify/patreon', loggedIn, unlinkPatreon)
router.post('/verify', verifyOauthKey)
router.get('/init', loggedIn, getInitialLoad)
router.get('/', loggedIn, getProfile)
router.get('/presets', loggedIn, getUserPresets)
router.get('/templates', loggedIn, getPromptTemplates)
router.delete('/presets/:id/key', loggedIn, deleteUserPresetKey)
router.get('/config', loggedIn, getConfig)
router.post('/config/service/:service', loggedIn, updateService)
router.post('/config/reveal-key', loggedIn, revealApiKey)
router.post('/config/generate-key', loggedIn, generateApiKey)
router.delete('/my-account', loggedIn, deleteUserAccount)
router.delete('/config/scale', loggedIn, deleteScaleKey)
router.delete('/config/horde', loggedIn, deleteHordeKey)
router.delete('/config/novel', loggedIn, deleteNovelKey)
router.delete('/config/openai', loggedIn, deleteOaiKey)
router.delete('/config/mistral', loggedIn, deleteMistralKey)
router.delete('/config/claude', loggedIn, deleteClaudeKey)
router.delete('/config/third-party', loggedIn, deleteThirdPartyPassword)
router.delete('/config/elevenlabs', loggedIn, deleteElevenLabsKey)
router.delete('/config/featherless', loggedIn, deleteFeatherlessKey)
router.delete('/presets/:id', loggedIn, deleteUserPreset)
router.post('/password', loggedIn, changePassword)
router.post('/ui', loggedIn, updateUI)
router.post('/config/partial', loggedIn, updatePartialConfig)
router.post('/config', loggedIn, updateConfig)
router.post('/profile', loggedIn, updateProfile)
router.delete('/profile/avatar', loggedIn, removeProfileAvatar)
router.post('/preset-models', getThirdPartyPresetModels)
router.post('/preset-test', testConnectionUrl)
router.post('/presets', loggedIn, createUserPreset)
router.post('/presets/:id', loggedIn, updateUserPreset)
router.post('/templates', loggedIn, createTemplate)
router.post('/templates/:id', loggedIn, updateTemplate)
router.delete('/templates/:id', loggedIn, deleteTemplate)
router.get('/:id', loggedIn, getProfile)

export default router
