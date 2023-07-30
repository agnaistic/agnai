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
import { getHordeWorkers, getHoredeModels } from './horde'

const router = Router()

let appConfig: AppSchema.AppConfig

const getSettings = handle(async () => {
  const config = await getAppConfig()
  return config
})

router.get('/', getSettings)

export default router

export async function getAppConfig() {
  const canAuth = isConnected()
  const workers = getHordeWorkers()
  const models = getHoredeModels()

  if (!appConfig) {
    appConfig = {
      adapters: config.adapters,
      version: '',
      selfhosting: config.jsonStorage,
      canAuth: false,
      imagesSaved: config.storage.saveImages,
      assetPrefix: config.storage.enabled
        ? `https://${config.storage.bucket}.${config.storage.endpoint}`
        : '',
      registered: getRegisteredAdapters().map(toRegisteredAdapter),
      maintenance: config.ui.maintenance,
      patreon: config.ui.patreon,
      policies: config.ui.policies,
      authUrls: config.auth.urls,
      pipelineProxyEnabled: config.pipelineProxy,
      horde: {
        models,
        workers: workers.filter((w) => w.type === 'text'),
      },
    }
  }

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
    const cfg = await store.admin.getConfig()

    appConfig.maintenance = cfg.maintenance || appConfig.maintenance
    appConfig.patreon = cfg.patreon ?? appConfig.patreon
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
