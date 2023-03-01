import dotenv from 'dotenv'
import { readFileSync, writeFileSync } from 'fs'
import { v4 } from 'uuid'

dotenv.config({ path: '.env' })

/**
 * We always want to use a relatively safe JWT signing secret
 * If the user has not provided one:
 * - Create one
 * - Save it to a file
 * - Apply it to the environment variables
 *
 * When the application restarts we will try to retrieve the previously saved secret
 */
if (!process.env.JWT_SECRET) {
  try {
    const secret = readFileSync('.token_secret', { encoding: 'utf8' })
    process.env.JWT_SECRET = secret
  } catch (ex) {
    const secret = v4()
    writeFileSync('.token_secret', secret)
    process.env.JWT_SECRET = secret
  }
}

export const config = {
  jwtSecret: env('JWT_SECRET'),
  port: +env('PORT', '3001'),
  db: {
    name: env('DB_NAME', 'pyg'),
    host: env('DB_HOST', ''),
    port: +env('DB_PORT', '27017'),
  },
  kobold: {
    maxLength: +env('KOBOLD_MAX_LENGTH', '200'),
  },
  noRequestLogs: env('DISABLE_REQUEST_LOGGING', 'false') === 'true',
  chai: {
    url: env('CHAI_URL', ''),
    uid: env('CHAI_UID', 'empty'),
    key: env('CHAI_KEY', 'empty'),
  },
  classifyUrl: env('CLASSIFY_URL', 'http://localhost:5001'),
  init: {
    username: env('INITIAL_USER', 'admin'),
    password: env('INITIAL_PASSWORD', v4()),
  },
}

function env(key: string, fallback?: string): string {
  const value = process.env[key] || fallback || ''

  if (value === undefined) {
    throw new Error(`Required environment variable not set: "${key}"`)
  }

  return value
}
