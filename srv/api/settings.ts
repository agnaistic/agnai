import { Router } from 'express'
import { readFile } from 'fs/promises'
import { resolve } from 'path'
import { getRegisteredAdapters } from '../adapter/register'
import { config } from '../config'
import { isConnected } from '../db/client'
import { handle } from './wrap'

const router = Router()

const appConfig: any = {
  adapters: config.adapters,
  version: null,
  // adapterSettings: getRegisteredAdapters().map((adp) => ({
  //   name: adp.name,
  //   settings: adp.options.settings,
  // })),
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
