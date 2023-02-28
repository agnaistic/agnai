import needle from 'needle'
import { Router } from 'express'
import { config } from '../../config'
import { handle } from '../wrap'

const router = Router()

router.get(
  '/status',
  handle(async () => {
    const res = await needle('get', url('/status')).catch(() => null)
    if (!res) return { status: false }
    return { status: res.body.status === 'ok' }
  })
)

export default router

function url(path: string) {
  path = path.startsWith('/') ? path : `/${path}`
  return `${config.classifyUrl}${path}`
}
