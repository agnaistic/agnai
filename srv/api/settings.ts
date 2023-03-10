import { Router } from 'express'
import { readFile } from 'fs/promises'
import { resolve } from 'path'
import { config } from '../config'
import { isConnected } from '../db/client'
import { handle } from './wrap'

const router = Router()

const appConfig: any = {
  adapters: config.adapters,
  version: null,
}

const getAppConfig = handle(async () => {
  const canAuth = isConnected()

  if (appConfig.version === null) {
    const content = await readFile(resolve(process.cwd(), 'version.txt')).catch(() => 'unknown')
    appConfig.version = content.toString().trim()
  }

  return { ...appConfig, canAuth }
})

router.get('/', getAppConfig)

export default router
