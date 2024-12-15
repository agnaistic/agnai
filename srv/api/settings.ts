import { Router } from 'express'
import { readFile } from 'fs/promises'
import { resolve } from 'path'
import { getRegisteredAdapters } from '../adapter/register'
import { config } from '../config'
import { isConnected } from '../db/client'
import { handle } from './wrap'
import { AppSchema } from '../../common/types/schema'
import { store } from '../db'
import { RegisteredAdapter } from '/common/adapters'
import { getHordeWorkers, getHordeModels } from './horde'
import { getOpenRouterModels } from '../adapter/openrouter'
import { updateRegisteredSubs } from '../adapter/agnaistic'
import { getFeatherModels } from '../adapter/featherless'
import { filterImageModels } from '/common/image-util'
import { getArliModels } from '../adapter/arli'

const router = Router()

let appConfig: AppSchema.AppConfig

const getSettings = handle(async ({ userId }) => {
  const user = userId ? await store.users.getUser(userId) : undefined
  const config = await getAppConfig(user!)
  return config
})

export const getPublicSubscriptions = handle(async () => {
  const subscriptions = store.subs.getCachedSubscriptions()
  return { subscriptions }
})

router.get('/subscriptions', getPublicSubscriptions)
router.get('/', getSettings)
router.get('/featherless', (_, res) => {
  const { models, classes } = getFeatherModels()
  res.json({ models, classes })
})
router.get('/arli', (_, res) => {
  const { models, classes } = getArliModels()
  res.json({ models, classes })
})

export default router

export async function getAppConfig(user?: AppSchema.User) {
  const canAuth = isConnected()
  const workers = getHordeWorkers()
  const models = getHordeModels()
  const openRouter = await getOpenRouterModels()

  const configuration = await store.admin.getServerConfiguration().catch(() => undefined)

  const subs = store.subs.getCachedSubscriptions()
  const userTier = user ? store.users.getUserSubTier(user) : undefined

  if (!user?.admin && configuration) {
    configuration.imagesHost = ''
    configuration.ttsHost = ''
    configuration.ttsApiKey = ''

    configuration.imagesModels = filterImageModels(
      user!,
      configuration.imagesModels,
      userTier?.tier
    )
  }

  if (!appConfig) {
    await Promise.all([store.subs.prepSubscriptionCache(), store.subs.prepTierCache()])
    updateRegisteredSubs()

    appConfig = {
      adapters: config.adapters,
      version: '',
      selfhosting: config.jsonStorage,
      canAuth: false,
      imagesSaved: config.storage.saveImages,
      assetPrefix: config.assetUrl
        ? config.assetUrl
        : config.storage.enabled
        ? `https://${config.storage.bucket}.${config.storage.endpoint}`
        : '',
      registered: getRegisteredAdapters(user).map(toRegisteredAdapter),
      maintenance: config.ui.maintenance,
      patreon: config.ui.patreon,
      policies: config.ui.policies,
      authUrls: config.auth.urls,
      pipelineProxyEnabled: config.pipelineProxy,
      horde: {
        models,
        workers: workers.filter((w) => w.type === 'text'),
      },
      openRouter: { models: openRouter },
      subs,
      serverConfig: configuration,
    }
  }

  if (user && configuration) {
    switch (configuration.apiAccess) {
      case 'off':
        break

      case 'admins':
        appConfig.apiAccess = !!user.admin
        break

      case 'subscribers':
        if (!userTier || userTier.level <= 0) break
        appConfig.apiAccess = !!userTier.tier.apiAccess
        break

      case 'users':
        appConfig.apiAccess = true
        break
    }
  }

  const patreonEnabled = !!(
    config.patreon.campaign_id &&
    config.patreon.client_id &&
    config.patreon.client_secret &&
    config.patreon.access_token
  )

  appConfig.guidanceAccess = !!userTier?.tier.guidanceAccess
  appConfig.tier = userTier?.tier
  appConfig.patreonAuth = patreonEnabled ? { clientId: config.patreon.client_id } : undefined
  appConfig.serverConfig = configuration
  appConfig.subs = subs
  appConfig.registered = getRegisteredAdapters(user).map(toRegisteredAdapter)
  appConfig.openRouter.models = openRouter
  appConfig.horde = {
    models,
    workers: workers.filter((w) => w.type === 'text'),
  }

  if (appConfig.version === '') {
    const content = await readFile(resolve(process.cwd(), 'version.txt')).catch(() => 'unknown')
    appConfig.version = content.toString().trim().slice(0, 11) || 'self-hosted'
  }

  return { ...appConfig, canAuth }
}

async function update() {
  try {
    if (!config.db.host) return
    const cfg = await store.admin.getServerConfiguration()

    appConfig.maintenance = cfg.maintenanceMessage || appConfig.maintenance
  } catch (ex) {}
}

setInterval(update, 15000)

function toRegisteredAdapter(adp: RegisteredAdapter) {
  return {
    name: adp.name,
    settings: adp.settings,
    options: adp.options,
  }
}
