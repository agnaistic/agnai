import pino from 'pino'
import 'pino-pretty'

export type AppLog = Omit<pino.Logger, 'child'> & {
  setBindings: (bindings: pino.Bindings) => void
  child: (bindings: pino.Bindings, options?: pino.ChildLoggerOptions) => AppLog
} & pino.Logger

export function createLogger(name: string) {
  const level = getLogLevel()
  const opts: any = {
    transport,
    name,
    level,
    serializers: {
      err: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
  }

  if (!opts.transport) {
    opts.timestamp = () => `,"time":"${new Date().toISOString()}"`
  }

  return pino(opts) as any as AppLog
}

const transport =
  typeof window !== 'undefined'
    ? { target: 'pino-pretty', options: { translateTime: `UTC:yyyy-mm-dd'T'HH:MM:ss'Z'` } }
    : process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { translateTime: `UTC:yyyy-mm-dd'T'HH:MM:ss'Z'` } }
    : undefined

function getLogLevel() {
  if (typeof window !== 'undefined') {
    return 'debug'
  }

  const level = process.env.LOG_LEVEL || 'info'
  switch (level) {
    case '60':
    case 'fatal':
      return 'fatal'

    case '50':
    case 'error':
      return 'error'

    case '40':
    case 'warn':
      return 'warn'

    case '30':
    case 'info':
      return 'info'

    case '20':
    case 'debug':
      return 'debug'

    case '10':
    case 'trace':
      return 'trace'
  }

  return 'info'
}

export const logger = createLogger('app')
