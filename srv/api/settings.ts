import { Router } from 'express'
import { readFile } from 'fs/promises'
import { resolve } from 'path'
import { getRegisteredAdapters } from '../adapter/register'
import { config } from '../config'
import { isConnected } from '../db/client'
import { handle } from './wrap'
import { AppSchema } from '../db/schema'

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
}

const getSettings = handle(async () => {
  const config = await getAppConfig()
  return config
})

router.get('/', getSettings)

export default router

export async function getAppConfig() {
  const canAuth = isConnected()

  if (appConfig.version === null) {
    const content = await readFile(resolve(process.cwd(), 'version.txt')).catch(() => 'unknown')
    appConfig.version = content.toString().trim().slice(0, 11)
  }

  return { ...appConfig, canAuth }
}
