import { Router } from 'express'
import { readFile } from 'fs/promises'
import { resolve } from 'path'
import { getRegisteredAdapters } from '../adapter/register'
import { config } from '../config'
import { isConnected } from '../db/client'
import { handle } from './wrap'
import { AppSchema } from '../../common/types/schema'
import { store } from '../db'

const router = Router()

const appConfig: AppSchema.AppConfig = {
  adapters: config.adapters,
  version: '',
  selfhosting: config.jsonStorage,
  canAuth: false,
  imagesSaved: config.storage.saveImages,
  assetPrefix: config.storage.enabled
    ? `https://${config.storage.bucket}.${config.storage.endpoint}`
    : '',
  registered: getRegisteredAdapters().map((adp) => ({
    name: adp.name,
    settings: adp.settings,
    options: adp.options,
  })),
  maintenance: config.ui.maintenance,
  patreon: config.ui.patreon,
  policies: config.ui.policies,
  slots: config.slots,
}

const getSettings = handle(async () => {
  const config = await getAppConfig()
  return config
})

router.get('/', getSettings)

export default router

export async function getAppConfig() {
  const canAuth = isConnected()

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
    appConfig.slots.enabled = cfg.slots?.enabled ?? appConfig.slots.enabled
    appConfig.slots.banner = cfg.slots?.banner || appConfig.slots.banner
    appConfig.slots.menu = cfg.slots?.menu || appConfig.slots.menu
    appConfig.slots.mobile = cfg.slots?.mobile || appConfig.slots.mobile
  } catch (ex) {}
}

setInterval(update, 15000)
