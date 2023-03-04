import { Router } from 'express'
import { config } from '../config'
import { handle } from './wrap'

const router = Router()

const appConfig = {
  adapters: config.adapters,
}

const getAppConfig = handle(async () => {
  return appConfig
})

router.get('/', getAppConfig)

export default router
