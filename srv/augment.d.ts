import * as core from 'express-serve-static-core'
import { Logger } from './middleware'
import { AppSchema } from '/common/types'

declare global {
  namespace Express {
    interface Request {}
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    log: Logger
  }
}
