import { Router } from 'express'
import { config } from '../config'
import { isConnected } from '../db/client'
import { handle } from './wrap'

const router = Router()

const appConfig = {
  adapters: config.adapters,
}

const getAppConfig = handle(async () => {
  const canAuth = isConnected()
  return { ...appConfig, canAuth }
})

router.get('/', getAppConfig)

export default router
