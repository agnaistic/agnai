import logging from 'debug'

const loggers: Record<string, ReturnType<typeof logging>> = {}

export function debug(name: string) {
  if (loggers[name]) {
    return loggers[name]
  }

  const logger = logging(name)
  loggers[name] = logger

  return logger
}
