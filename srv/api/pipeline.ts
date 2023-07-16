import needle from 'needle'
import { StatusError, wrap } from './wrap'
import { Router } from 'express'

const router = Router()

const proxy = wrap(async (req) => {
  const method = req.method === 'GET' ? 'get' : req.method === 'DELETE' ? 'delete' : 'post'
  const body = method === 'post' ? req.body : undefined

  /**
   * @todo
   * Consider allowing a configurable URL for pipeline.
   * Potentially use environment variable.
   */

  const res =
    method === 'post'
      ? await needle(method, `http://localhost:5001${req.baseUrl}`, body, { json: true })
      : await needle(method, `http://localhost:5001${req.baseUrl}`, { json: true })

  if (res.statusCode && res.statusCode >= 400) {
    throw new StatusError(res.statusMessage || res.body, res.statusCode)
  }
  return res.body
})

router.use('/*', proxy)

export default router
